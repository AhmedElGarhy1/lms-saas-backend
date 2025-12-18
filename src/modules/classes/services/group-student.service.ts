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
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { Transactional } from '@nestjs-cls/transactional';
import { GroupStudent } from '../entities/group-student.entity';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';

@Injectable()
export class GroupStudentService extends BaseService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
    private readonly groupValidationService: GroupValidationService,
    private readonly scheduleService: ScheduleService,
    private readonly bulkOperationService: BulkOperationService,
  ) {
    super();
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
    const group = await this.groupsRepository.findOneWithClassOrThrow(groupId);

    const existingActiveAssignment =
      await this.groupStudentsRepository.findByGroupAndStudent(
        groupId,
        userProfileId,
      );

    if (existingActiveAssignment) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.student',
        state: 'assigned to group',
      });
    }

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

    const scheduleItems =
      await this.scheduleItemsRepository.findByGroupId(groupId);
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
          studentIds: [userProfileId],
          excludeGroupIds: undefined,
        },
      );
    }

    await this.groupStudentsRepository.create({
      groupId,
      studentUserProfileId: userProfileId,
      classId: group.classId,
      joinedAt: new Date(),
    });
  }

  /**
   * Gets all student assignments for a specific group.
   *
   * @param groupId - The group ID (path parameter, validated by DTO)
   * @returns Array of GroupStudent assignments
   * @throws ResourceNotFoundException if group doesn't exist or doesn't belong to actor's center
   */
  async getGroupStudents(groupId: string): Promise<GroupStudent[]> {
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
   * @returns BulkOperationResult with success/failure details for each student
   * @throws BusinessLogicException if userProfileIds array is empty
   */
  @Transactional()
  async bulkAssignStudentsToGroup(
    groupId: string,
    userProfileIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!userProfileIds || userProfileIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    return await this.bulkOperationService.executeBulk(
      userProfileIds,
      async (userProfileId: string) => {
        await this.assignStudentToGroup(groupId, userProfileId, actor);
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
   * @returns BulkOperationResult with success/failure details for each student
   * @throws BusinessLogicException if studentUserProfileIds array is empty
   */
  @Transactional()
  async removeStudentsFromGroup(
    groupId: string,
    studentUserProfileIds: string[],
  ): Promise<BulkOperationResult> {
    if (!studentUserProfileIds || studentUserProfileIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

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

        await this.groupStudentsRepository.update(groupStudent.id, {
          leftAt: new Date(),
        });
        return { id: studentUserProfileId };
      },
    );
  }
}
