import { Injectable } from '@nestjs/common';
import { GroupsRepository } from '../repositories/groups.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import { ScheduleItemsRepository } from '../repositories/schedule-items.repository';
import { GroupValidationService } from './group-validation.service';
import { ScheduleService } from './schedule.service';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import {
  ResourceNotFoundException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from './class-access.service';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { Transactional } from '@nestjs-cls/transactional';
import { GroupStudent } from '../entities/group-student.entity';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { GroupStudentAccessDto } from '../dto/group-student-access.dto';
import { ClassStatus } from '../enums/class-status.enum';
import { TimezoneService } from '@/shared/common/services/timezone.service';

@Injectable()
export class GroupStudentService extends BaseService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
    private readonly groupValidationService: GroupValidationService,
    private readonly scheduleService: ScheduleService,
    private readonly bulkOperationService: BulkOperationService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly branchAccessService: BranchAccessService,
    private readonly classAccessService: ClassAccessService,
  ) {
    super();
  }

  /**
   * Assigns a student to a group with comprehensive validation.
   * Performs the following validations:
   * 1. Group exists and actor has access (validated by DTO)
   * 2. Student is not already assigned to this group
   * 3. Student profile exists and is of type STUDENT (validated by DTO)
   * 4. Student has center access (validated by DTO)
   * 5. Student is not already in another group of the same class
   * 6. Student's schedule doesn't conflict with other assigned groups
   *
   * @param data - GroupStudentAccessDto containing groupId and userProfileId
   * @param actor - The user performing the action
   * @throws ResourceNotFoundException if group doesn't exist or actor lacks access
   * @throws BusinessLogicException if student is already assigned, wrong profile type, or schedule conflict
   */
  async assignStudentToGroup(
    data: GroupStudentAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = actor.centerId!;

    // Validate actor has user access to target user (optional centerId)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId: centerId, // Optional - can be undefined
    });

    // Validate target user has center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: data.userProfileId,
      centerId: centerId,
    });

    const group = await this.groupsRepository.findByIdOrThrow(data.groupId, [
      'class',
    ]);

    // Block enrollment if class status is CANCELED or FINISHED
    if (
      group.class &&
      (group.class.status === ClassStatus.CANCELED ||
        group.class.status === ClassStatus.FINISHED)
    ) {
      throw new BusinessLogicException('t.messages.cannotEnrollInClass', {
        status: group.class.status,
      });
    }

    // Validate actor has branch access to the group's branch (via class)
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

    const existingActiveAssignment =
      await this.groupStudentsRepository.findByGroupAndStudent(
        data.groupId,
        data.userProfileId,
      );

    if (existingActiveAssignment) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.student',
        state: 'assigned to group',
      });
    }

    const existingGroupIds =
      await this.groupStudentsRepository.findStudentGroupIdsByClassId(
        data.userProfileId,
        group.classId,
        undefined, // Not excluding any group (new assignment)
      );

    if (existingGroupIds.length > 0) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.student',
        state: 'assigned to class',
      });
    }

    const scheduleItems = await this.scheduleItemsRepository.findByGroupId(
      data.groupId,
    );
    if (scheduleItems && scheduleItems.length > 0) {
      const scheduleItemsDto: ScheduleItemDto[] = scheduleItems.map((item) => ({
        day: item.day,
        startTime: item.startTime,
      }));

      if (!group.class || !group.class.duration) {
        throw new BusinessLogicException('t.messages.validationFailed');
      }

      await this.scheduleService.validateScheduleConflicts(
        scheduleItemsDto,
        group.class.duration,
        {
          studentIds: [data.userProfileId],
          excludeGroupIds: undefined,
          skipWarning: data.skipWarning,
        },
      );
    }

    await this.groupStudentsRepository.create({
      groupId: data.groupId,
      studentUserProfileId: data.userProfileId,
      classId: group.classId,
      joinedAt: TimezoneService.getZonedNowFromContext(),
    });
  }

  /**
   * Gets all student assignments for a specific group.
   *
   * @param groupId - The group ID (path parameter, validated by DTO)
   * @param actor - The user performing the action
   * @returns Array of GroupStudent assignments
   * @throws ResourceNotFoundException if group doesn't exist or doesn't belong to actor's center
   */
  async getGroupStudents(
    groupId: string,
    actor: ActorUser,
  ): Promise<GroupStudent[]> {
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
    ]);

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

    return this.groupStudentsRepository.findByGroupId(groupId);
  }

  /**
   * Bulk assigns multiple students to a group.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some students may succeed while others fail.
   *
   * @param groupId - The group ID to assign students to
   * @param userProfileIds - Array of student user profile IDs
   * @param actor - The user performing the action
   * @param skipWarning - If true, student conflicts are silently skipped
   * @returns BulkOperationResult with success/failure details for each student
   * @throws BusinessLogicException if userProfileIds array is empty
   */
  @Transactional()
  async bulkAssignStudentsToGroup(
    groupId: string,
    userProfileIds: string[],
    actor: ActorUser,
    skipWarning?: boolean,
  ): Promise<BulkOperationResult> {
    if (!userProfileIds || userProfileIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    return await this.bulkOperationService.executeBulk(
      userProfileIds,
      async (userProfileId: string) => {
        const data: GroupStudentAccessDto = {
          groupId,
          userProfileId,
          skipWarning,
        };
        await this.assignStudentToGroup(data, actor);
        return { id: userProfileId };
      },
    );
  }

  /**
   * Removes multiple students from a group.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some students may succeed while others fail.
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
  ): Promise<BulkOperationResult> {
    if (!studentUserProfileIds || studentUserProfileIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    const centerId = actor.centerId!;

    // Fetch group to get branchId
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
    ]);

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

    return await this.bulkOperationService.executeBulk(
      studentUserProfileIds,
      async (studentUserProfileId: string) => {
        // Validate actor has user access to target user (optional centerId)
        await this.accessControlHelperService.validateUserAccess({
          granterUserProfileId: actor.userProfileId,
          targetUserProfileId: studentUserProfileId,
          centerId: centerId, // Optional - can be undefined
        });

        // Validate target user has center access
        await this.accessControlHelperService.validateCenterAccess({
          userProfileId: studentUserProfileId,
          centerId: centerId,
        });

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

        await this.groupStudentsRepository.update(groupStudent.id, {
          leftAt: TimezoneService.getZonedNowFromContext(),
        });
        return { id: studentUserProfileId };
      },
    );
  }
}
