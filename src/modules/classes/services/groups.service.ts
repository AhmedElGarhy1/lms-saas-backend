import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { PaginateGroupsDto } from '../dto/paginate-groups.dto';
import { GroupsRepository } from '../repositories/groups.repository';
import { ClassesRepository } from '../repositories/classes.repository';
import { ScheduleItemsRepository } from '../repositories/schedule-items.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import { GroupValidationService } from './group-validation.service';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import {
  ResourceNotFoundException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { Group } from '../entities/group.entity';
import { Class } from '../entities/class.entity';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
  GroupDeletedEvent,
  GroupRestoredEvent,
} from '../events/group.events';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { ScheduleService } from './schedule.service';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { Transactional } from '@nestjs-cls/transactional';
import { ClassAccessService } from './class-access.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Injectable()
export class GroupsService extends BaseService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly classesRepository: ClassesRepository,
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly groupValidationService: GroupValidationService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly bulkOperationService: BulkOperationService,
    private readonly scheduleService: ScheduleService,
    private readonly classAccessService: ClassAccessService,
  ) {
    super();
  }

  /**
   * Paginate groups for a center with filtering and search capabilities.
   *
   * @param paginateDto - Pagination and filter parameters
   * @param actor - The user performing the action
   * @returns Paginated list of groups with computed fields (studentsCount)
   */
  async paginateGroups(
    paginateDto: PaginateGroupsDto,
    actor: ActorUser,
  ): Promise<Pagination<Group>> {
    return this.groupsRepository.paginateGroups(paginateDto, actor.centerId!);
  }

  /**
   * Get a single group with all relations loaded.
   *
   * @param groupId - The group ID
   * @param actor - The user performing the action
   * @param includeDeleted - Whether to include soft-deleted groups
   * @returns Group entity with all relations (scheduleItems, class, branch, center)
   * @throws ResourceNotFoundException if group doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  async getGroup(
    groupId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<Group> {
    const group = await this.groupsRepository.findGroupWithRelations(
      groupId,
      includeDeleted,
    );
    if (!group) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.group',
        identifier: 't.resources.identifier',
        value: groupId,
      });
    }

    // For STAFF: validate class access via ClassStaff assignment
    // For non-STAFF: no validation needed (ContextGuard ensures center access)
    if (actor.profileType === ProfileType.STAFF) {
      await this.classAccessService.validateClassAccess(
        actor.userProfileId,
        group.classId,
      );
    }

    return group;
  }

  /**
   * Create a new group with schedule items.
   * Validates group data, creates group entity, and sets up schedule items.
   *
   * @param createGroupDto - Group creation data including schedule items
   * @param actor - The user performing the action
   * @returns Created group entity with all relations loaded
   * @throws BusinessLogicException if validation fails or schedule conflicts detected
   */
  @Transactional()
  async createGroup(
    createGroupDto: CreateGroupDto,
    actor: ActorUser,
  ): Promise<Group> {
    // Validate group creation
    const classEntity = await this.groupValidationService.validateGroup(
      createGroupDto.classId,
      createGroupDto.scheduleItems,
      actor,
      undefined,
    );

    // Create group entity
    const group = await this.groupsRepository.create({
      classId: createGroupDto.classId,
      branchId: classEntity.branchId,
      centerId: classEntity.centerId,
      name: createGroupDto.name,
    });

    // Create schedule items
    await this.createScheduleItems(group.id, createGroupDto.scheduleItems);

    // Load group with relations and emit event
    const createdGroup = await this.getGroup(group.id, actor);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.CREATED,
      new GroupCreatedEvent(createdGroup, classEntity, actor, actor.centerId!),
    );

    return createdGroup;
  }

  private async createScheduleItems(
    groupId: string,
    scheduleItems: CreateGroupDto['scheduleItems'],
  ): Promise<void> {
    await this.scheduleItemsRepository.bulkCreate(groupId, scheduleItems);
  }

  /**
   * Assigns a student to a group with comprehensive validation.
   * Performs the following validations:
   * 1. Group exists and actor has access
   * 2. Student is not already assigned to this group
   * 3. Student profile exists and is of type STUDENT
   * 4. Student has center access
   * 5. Student is not already in another group of the same class
   * 6. Student's schedule doesn't conflict with other assigned groups
   *
   * @param groupId - The group ID to assign the student to
   * @param userProfileId - The student's user profile ID
   * @param actor - The user performing the action
   * @throws ResourceNotFoundException if group doesn't exist or actor lacks access
   * @throws BusinessLogicException if student is already assigned, wrong profile type, or schedule conflict
   */
  async assignStudentToGroup(
    groupId: string,
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    // Verify group exists
    const group = await this.groupsRepository.findOneOrThrow(groupId);

    // Get existing students
    const existingStudents =
      await this.groupStudentsRepository.findByGroupId(groupId);
    const existingStudentIds = existingStudents.map(
      (gs) => gs.studentUserProfileId,
    );

    // Check if already assigned
    if (existingStudentIds.includes(userProfileId)) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.student',
        state: 'assigned to group',
      });
    }

    // Validate student (with branch access)
    await this.groupValidationService.validateStudents([userProfileId], actor);

    // Check if student is already in another group of the same class
    // Business logic: interpret repository data
    const existingGroupIds =
      await this.groupStudentsRepository.findStudentGroupIdsByClassId(
        userProfileId,
        group.classId,
        undefined, // Not excluding any group (new assignment)
      );

    if (existingGroupIds.length > 0) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.student',
        state: 'assigned to class',
      });
    }

    // Check for schedule conflicts with other groups the student is assigned to
    const scheduleItems =
      await this.scheduleItemsRepository.findByGroupId(groupId);
    if (scheduleItems && scheduleItems.length > 0) {
      const scheduleItemsDto: ScheduleItemDto[] = scheduleItems.map((item) => ({
        day: item.day,
        startTime: item.startTime,
      }));

      // Fetch class entity separately instead of relying on relation
      const classEntity = await this.classesRepository.findOne(group.classId);
      if (!classEntity || !classEntity.duration) {
        throw new BusinessLogicException('t.messages.validationFailed');
      }

      // Check for student schedule conflicts
      await this.scheduleService.validateScheduleConflicts(
        scheduleItemsDto,
        classEntity.duration,
        {
          studentIds: [userProfileId],
          excludeGroupIds: undefined, // Not excluding any group (new assignment)
        },
      );
    }

    // Create assignment
    await this.groupStudentsRepository.create({
      groupId,
      studentUserProfileId: userProfileId,
      classId: group.classId,
    });
  }

  /**
   * Bulk assigns multiple students to a group.
   * Uses BulkOperationService for consistent error handling and reporting.
   *
   * @param groupId - The group ID to assign students to
   * @param userProfileIds - Array of student user profile IDs
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each student
   * @throws BusinessLogicException if userProfileIds array is empty
   */
  async bulkAssignStudentsToGroup(
    groupId: string,
    userProfileIds: string[],
    actor: ActorUser,
  ) {
    // Validate input
    if (!userProfileIds || userProfileIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    // Verify group exists
    await this.groupsRepository.findOneOrThrow(groupId);

    // Use bulk operation service for consistent error handling
    return await this.bulkOperationService.executeBulk(
      userProfileIds,
      async (userProfileId: string) => {
        await this.assignStudentToGroup(groupId, userProfileId, actor);
        return { id: userProfileId };
      },
    );
  }

  @Transactional()
  async updateGroup(
    groupId: string,
    data: UpdateGroupDto,
    actor: ActorUser,
  ): Promise<Group> {
    const group = await this.groupsRepository.findOneOrThrow(groupId);

    // Validate group update
    await this.groupValidationService.validateGroup(
      group.classId,
      data.scheduleItems,
      actor,
      [groupId],
      groupId,
    );

    // Update name if provided
    if (data.name !== undefined) {
      await this.groupsRepository.update(groupId, { name: data.name });
    }

    // Update schedule items if provided
    if (data.scheduleItems) {
      await this.updateScheduleItems(groupId, data.scheduleItems);
    }

    // Load updated group and emit event
    const updatedGroup = await this.getGroup(groupId, actor);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.UPDATED,
      new GroupUpdatedEvent(updatedGroup, actor, actor.centerId!),
    );

    return updatedGroup;
  }

  private async updateScheduleItems(
    groupId: string,
    scheduleItems: UpdateGroupDto['scheduleItems'],
  ): Promise<void> {
    if (!scheduleItems) return;

    // Business logic: delete then create pattern
    // Use repository methods for data access only
    await this.scheduleItemsRepository.deleteByGroupId(groupId);
    await this.scheduleItemsRepository.bulkCreate(groupId, scheduleItems);
  }

  /**
   * Soft delete a group.
   * Marks the group as deleted but preserves data for potential restoration.
   *
   * @param groupId - The group ID to delete
   * @param actor - The user performing the action
   * @throws ResourceNotFoundException if group doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  async deleteGroup(groupId: string, actor: ActorUser): Promise<void> {
    await this.groupsRepository.findOneOrThrow(groupId);
    await this.groupsRepository.softRemove(groupId);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.DELETED,
      new GroupDeletedEvent(groupId, actor, actor.centerId!),
    );
  }

  /**
   * Restore a soft-deleted group.
   * Recovers a previously deleted group and makes it active again.
   *
   * @param groupId - The group ID to restore
   * @param actor - The user performing the action
   * @throws ResourceNotFoundException if group doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  async restoreGroup(groupId: string, actor: ActorUser): Promise<void> {
    const group = await this.groupsRepository.findOneSoftDeletedById(groupId);
    if (!group) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.group',
        identifier: 't.resources.identifier',
        value: groupId,
      });
    }

    await this.groupsRepository.restore(groupId);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.RESTORED,
      new GroupRestoredEvent(group, actor, actor.centerId!),
    );
  }

  /**
   * Removes multiple students from a group.
   * Uses BulkOperationService for consistent error handling and reporting.
   *
   * @param groupId - The group ID to remove students from
   * @param studentUserProfileIds - Array of student user profile IDs to remove
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each student
   * @throws BusinessLogicException if studentUserProfileIds array is empty
   */
  @Transactional()
  async removeStudentsFromGroup(
    groupId: string,
    studentUserProfileIds: string[],
    actor: ActorUser,
  ) {
    // Validate input
    if (!studentUserProfileIds || studentUserProfileIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    // Verify group exists
    await this.groupsRepository.findOneOrThrow(groupId);

    // Use bulk operation service for consistent error handling
    return await this.bulkOperationService.executeBulk(
      studentUserProfileIds,
      async (studentUserProfileId: string) => {
        const groupStudent =
          await this.groupStudentsRepository.findByGroupAndStudent(
            groupId,
            studentUserProfileId,
          );
        if (!groupStudent) {
          throw new ResourceNotFoundException('t.messages.notFound', {
            resource: 't.resources.groupStudent',
          });
        }

        // Use hard delete (remove) since GroupStudent extends BaseEntity, not SoftBaseEntity
        await this.groupStudentsRepository.remove(groupStudent.id);
        return { id: studentUserProfileId };
      },
    );
  }
}
