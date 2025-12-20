import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { PaginateGroupsDto } from '../dto/paginate-groups.dto';
import { GroupsRepository } from '../repositories/groups.repository';
import { GroupValidationService } from './group-validation.service';
import { GroupScheduleService } from './group-schedule.service';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { Group } from '../entities/group.entity';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
  GroupDeletedEvent,
  GroupRestoredEvent,
} from '../events/group.events';
import { Transactional } from '@nestjs-cls/transactional';
import { ClassAccessService } from './class-access.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';

@Injectable()
export class GroupsService extends BaseService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupValidationService: GroupValidationService,
    private readonly groupScheduleService: GroupScheduleService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly classAccessService: ClassAccessService,
    private readonly bulkOperationService: BulkOperationService,
    private readonly branchAccessService: BranchAccessService,
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
    return this.groupsRepository.paginateGroups(paginateDto, actor);
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
    const group = await this.groupsRepository.findGroupWithRelationsOrThrow(
      groupId,
      includeDeleted,
    );

    // Validate actor has branch access to the group's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    // Validate actor has ClassStaff access to the parent class
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

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
    const classEntity = await this.groupValidationService.validateGroupSchedule(
      createGroupDto.classId,
      createGroupDto.scheduleItems,
      undefined,
    );

    // Validate actor has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });

    // Validate actor has ClassStaff access to the parent class
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: classEntity.id,
    });

    const group = await this.groupsRepository.create({
      classId: createGroupDto.classId,
      branchId: classEntity.branchId,
      centerId: classEntity.centerId,
      name: createGroupDto.name,
    });

    await this.groupScheduleService.createScheduleItems(
      group.id,
      createGroupDto.scheduleItems,
    );

    const createdGroup = await this.getGroup(group.id, actor);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.CREATED,
      new GroupCreatedEvent(createdGroup, classEntity, actor, actor.centerId!),
    );

    return createdGroup;
  }

  @Transactional()
  async updateGroup(
    groupId: string,
    data: UpdateGroupDto,
    actor: ActorUser,
  ): Promise<Group> {
    const group = await this.groupsRepository.findGroupWithRelationsOrThrow(
      groupId,
      false,
    );

    // Validate actor has branch access to the group's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    // Validate actor has ClassStaff access to the parent class
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    await this.groupValidationService.validateScheduleCore(
      group.class,
      data.scheduleItems,
      undefined,
      groupId,
    );

    if (data.name !== undefined) {
      await this.groupsRepository.update(groupId, { name: data.name });
      group.name = data.name;
    }

    if (data.scheduleItems) {
      await this.groupScheduleService.updateScheduleItems(
        groupId,
        data.scheduleItems,
      );
      const updatedGroup =
        await this.groupsRepository.findGroupWithRelationsOrThrow(
          groupId,
          false,
        );
      if (updatedGroup) {
        Object.assign(group, updatedGroup);
      }
    }

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.UPDATED,
      new GroupUpdatedEvent(group, actor, actor.centerId!),
    );

    return group;
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
    const group = await this.groupsRepository.findGroupWithRelationsOrThrow(
      groupId,
      false,
    );

    // Validate actor has branch access to the group's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    // Validate actor has ClassStaff access to the parent class
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

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
    // Manual validation needed: BelongsToCenter only checks active groups
    const group = await this.groupsRepository.findOneSoftDeletedById(groupId);
    if (!group) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.group',
        identifier: 't.resources.identifier',
        value: groupId,
      });
    }
    const centerId = actor.centerId;
    if (!centerId || group.centerId !== centerId) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.group',
        identifier: 't.resources.identifier',
        value: groupId,
      });
    }

    // Validate actor has branch access to the group's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: centerId,
      branchId: group.branchId,
    });

    // Validate actor has ClassStaff access to the parent class
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    await this.groupsRepository.restore(groupId);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.RESTORED,
      new GroupRestoredEvent(group, actor, centerId),
    );
  }

  /**
   * Deletes multiple groups in bulk.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some groups may succeed while others fail.
   *
   * @param groupIds - Array of group IDs to delete
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each group
   * @throws BusinessLogicException if groupIds array is empty
   */
  @Transactional()
  async bulkDeleteGroups(
    groupIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!groupIds || groupIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    return await this.bulkOperationService.executeBulk(
      groupIds,
      async (groupId: string) => {
        await this.deleteGroup(groupId, actor);
        return { id: groupId };
      },
    );
  }

  /**
   * Restores multiple soft-deleted groups in bulk.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some groups may succeed while others fail.
   *
   * @param groupIds - Array of group IDs to restore
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each group
   * @throws BusinessLogicException if groupIds array is empty
   */
  @Transactional()
  async bulkRestoreGroups(
    groupIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!groupIds || groupIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    return await this.bulkOperationService.executeBulk(
      groupIds,
      async (groupId: string) => {
        await this.restoreGroup(groupId, actor);
        return { id: groupId };
      },
    );
  }
}
