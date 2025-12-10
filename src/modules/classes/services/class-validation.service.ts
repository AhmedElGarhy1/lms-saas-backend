import { Injectable } from '@nestjs/common';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { LevelsRepository } from '@/modules/levels/repositories/levels.repository';
import { SubjectsRepository } from '@/modules/subjects/repositories/subjects.repository';
import { BranchesRepository } from '@/modules/centers/repositories/branches.repository';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import {
  ResourceNotFoundException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ValidationHelpers } from '../utils/validation-helpers';
import { ScheduleService } from './schedule.service';
import { GroupsRepository } from '../repositories/groups.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { Class } from '../entities/class.entity';

@Injectable()
export class ClassValidationService extends BaseService {
  constructor(
    private readonly levelsRepository: LevelsRepository,
    private readonly subjectsRepository: SubjectsRepository,
    private readonly branchesRepository: BranchesRepository,
    private readonly userProfileService: UserProfileService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly scheduleService: ScheduleService,
    private readonly groupsRepository: GroupsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
  ) {
    super();
  }

  async validateClassCreation(
    dto: CreateClassDto,
    actor: ActorUser,
    centerId: string,
  ): Promise<void> {
    // Validate related entities
    await this.validateRelatedEntities(dto, centerId);

    // Validate teacher
    await this.validateTeacher(dto.teacherUserProfileId, centerId);
  }

  async validateClassUpdate(
    classId: string,
    dto: UpdateClassDto,
    actor: ActorUser,
    centerId: string,
    currentClass: Class,
  ): Promise<void> {
    // Validate duration if provided (DTO validation handles range, but we check for conflicts)
    if (dto.duration !== undefined) {
      // If duration is changing and class has groups, check for schedule conflicts
      if (dto.duration !== currentClass.duration) {
        await this.validateDurationUpdateConflicts(
          classId,
          dto.duration,
          currentClass.teacherUserProfileId,
        );
      }
    }
  }

  async validateRelatedEntities(
    dto: CreateClassDto,
    centerId: string,
  ): Promise<void> {
    // Validate level if provided
    if (dto.levelId) {
      const level = await this.levelsRepository.findOne(dto.levelId);
      ValidationHelpers.validateResourceExistsAndBelongsToCenter(
        level,
        dto.levelId,
        centerId,
        't.resources.level',
      );
    }

    // Validate subject if provided
    if (dto.subjectId) {
      const subject = await this.subjectsRepository.findOne(dto.subjectId);
      ValidationHelpers.validateResourceExistsAndBelongsToCenter(
        subject,
        dto.subjectId,
        centerId,
        't.resources.subject',
      );
    }

    // Validate branch if provided
    if (dto.branchId) {
      const branch = await this.branchesRepository.findOne(dto.branchId);
      ValidationHelpers.validateResourceExistsAndBelongsToCenter(
        branch,
        dto.branchId,
        centerId,
        't.resources.branch',
      );
    }
  }

  async validateTeacher(
    teacherUserProfileId: string,
    centerId: string,
  ): Promise<void> {
    const teacherProfile =
      await this.userProfileService.findOne(teacherUserProfileId);
    if (!teacherProfile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: teacherUserProfileId,
      });
    }

    if (teacherProfile.profileType !== ProfileType.TEACHER) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    // Validate teacher has center access (teachers only have center access, not branch access)
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: teacherUserProfileId,
      centerId,
    });
  }

  /**
   * Validates that updating class duration won't cause schedule conflicts.
   * Uses optimized flow: check teacher conflicts first, only check students if teacher has no conflicts.
   *
   * @param classId - The class ID being updated
   * @param newDuration - The new duration value
   * @param teacherUserProfileId - The teacher's user profile ID
   * @throws BusinessLogicException if schedule conflicts are detected, with structured conflict data in ErrorDetail[]
   */
  async validateDurationUpdateConflicts(
    classId: string,
    newDuration: number,
    teacherUserProfileId: string,
  ): Promise<void> {
    // Load all groups for this class with their schedule items
    // Repository handles which relations to load - service doesn't specify
    const groups =
      await this.groupsRepository.findGroupsByClassIdWithScheduleAndStudents(
        classId,
      );

    // If no groups exist, no conflicts possible
    if (!groups || groups.length === 0) {
      return;
    }

    // Collect schedule items from all groups
    const allScheduleItems: ScheduleItemDto[] = [];
    const groupIds = groups.map((g) => g.id);

    for (const group of groups) {
      if (group.scheduleItems && group.scheduleItems.length > 0) {
        const scheduleItems: ScheduleItemDto[] = group.scheduleItems.map(
          (item) => ({
            day: item.day,
            startTime: item.startTime,
          }),
        );
        allScheduleItems.push(...scheduleItems);
      }
    }

    // If no schedule items exist, no conflicts possible
    if (allScheduleItems.length === 0) {
      return;
    }

    // Get all unique student IDs from groups in this class
    const allGroupStudents = await Promise.all(
      groupIds.map((groupId) =>
        this.groupStudentsRepository.findByGroupId(groupId),
      ),
    );

    const studentIdsSet = new Set<string>();
    for (const groupStudents of allGroupStudents) {
      for (const groupStudent of groupStudents) {
        studentIdsSet.add(groupStudent.studentUserProfileId);
      }
    }

    const studentIds = Array.from(studentIdsSet);

    // Validate schedule items and check conflicts for both teacher and students
    await this.scheduleService.validateScheduleConflicts(
      allScheduleItems,
      newDuration,
      {
        teacherUserProfileId,
        studentIds: studentIds.length > 0 ? studentIds : undefined,
        excludeGroupIds: groupIds, // Exclude all groups from this class
      },
    );
  }
}
