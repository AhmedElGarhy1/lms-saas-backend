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

    // Validate dates
    this.validateDates(dto.startDate, dto.endDate);

    // Validate duration
    this.validateDuration(dto.duration);
  }

  async validateClassUpdate(
    classId: string,
    dto: UpdateClassDto,
    actor: ActorUser,
    centerId: string,
    currentClass: {
      branchId: string;
      startDate: Date;
      endDate?: Date;
      teacherUserProfileId: string;
      duration: number;
    },
  ): Promise<void> {
    // Validate related entities if provided
    if (dto.levelId || dto.subjectId || dto.branchId) {
      await this.validateRelatedEntities(dto, centerId);
    }

    // Validate teacher if provided
    if (dto.teacherUserProfileId) {
      await this.validateTeacher(dto.teacherUserProfileId, centerId);
    }

    // Validate dates if provided
    const startDate = dto.startDate || currentClass.startDate;
    const endDate =
      dto.endDate !== undefined ? dto.endDate : currentClass.endDate;
    this.validateDates(startDate, endDate);

    // Validate duration if provided
    if (dto.duration !== undefined) {
      this.validateDuration(dto.duration);

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
    dto: CreateClassDto | UpdateClassDto,
    centerId: string,
  ): Promise<void> {
    // Validate level if provided
    if (dto.levelId) {
      const level = await this.levelsRepository.findOne(dto.levelId);
      ValidationHelpers.validateResourceExistsAndBelongsToCenter(
        level,
        dto.levelId,
        centerId,
        't.common.resources.level',
      );
    }

    // Validate subject if provided
    if (dto.subjectId) {
      const subject = await this.subjectsRepository.findOne(dto.subjectId);
      ValidationHelpers.validateResourceExistsAndBelongsToCenter(
        subject,
        dto.subjectId,
        centerId,
        't.common.resources.subject',
      );
    }

    // Validate branch if provided
    if (dto.branchId) {
      const branch = await this.branchesRepository.findOne(dto.branchId);
      ValidationHelpers.validateResourceExistsAndBelongsToCenter(
        branch,
        dto.branchId,
        centerId,
        't.common.resources.branch',
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
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.profile',
        identifier: 'ID',
        value: teacherUserProfileId,
      });
    }

    if (teacherProfile.profileType !== ProfileType.TEACHER) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Teacher profile must be of type TEACHER',
      });
    }

    // Validate teacher profile is active
    if (!teacherProfile.isActive) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Teacher profile must be active',
      });
    }

    // Validate teacher has center access (teachers only have center access, not branch access)
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: teacherUserProfileId,
      centerId,
    });
  }

  validateDates(startDate: Date, endDate?: Date): void {
    if (endDate && startDate >= endDate) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Start date must be before end date',
      });
    }
  }

  validateDuration(duration: number): void {
    if (!duration || duration <= 0) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Duration must be a positive number',
      });
    }

    // Maximum duration: 24 hours (1440 minutes)
    const maxDuration = 24 * 60;
    if (duration > maxDuration) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: `Duration cannot exceed ${maxDuration} minutes (24 hours)`,
      });
    }
  }

  /**
   * Validates that updating class duration won't cause schedule conflicts.
   * Reuses existing conflict checking methods to avoid code duplication.
   *
   * @param classId - The class ID being updated
   * @param newDuration - The new duration value
   * @param teacherUserProfileId - The teacher's user profile ID
   * @throws BusinessLogicException if schedule conflicts are detected
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

    // Fetch groupStudents separately for all groups instead of relying on relation
    const groupIds = groups.map((g) => g.id);
    const allGroupStudents = await Promise.all(
      groupIds.map((groupId) =>
        this.groupStudentsRepository.findByGroupId(groupId),
      ),
    );

    // Create a map of groupId -> groupStudents for quick lookup
    const groupStudentsMap = new Map<string, (typeof allGroupStudents)[0]>();
    groupIds.forEach((groupId, index) => {
      groupStudentsMap.set(groupId, allGroupStudents[index]);
    });

    // Collect schedule items and group information
    const allScheduleItems: ScheduleItemDto[] = [];
    const studentToGroupsMap = new Map<string, ScheduleItemDto[]>();

    for (const group of groups) {
      if (group.scheduleItems && group.scheduleItems.length > 0) {
        const scheduleItems: ScheduleItemDto[] = group.scheduleItems.map(
          (item) => ({
            day: item.day,
            startTime: item.startTime,
          }),
        );

        // Add to all schedule items (for teacher conflict check)
        allScheduleItems.push(...scheduleItems);

        // Map schedule items to students in this group (fetch from separate query)
        const groupStudents = groupStudentsMap.get(group.id) || [];
        for (const groupStudent of groupStudents) {
          const studentId = groupStudent.studentUserProfileId;
          const existingItems = studentToGroupsMap.get(studentId) || [];
          studentToGroupsMap.set(studentId, [
            ...existingItems,
            ...scheduleItems,
          ]);
        }
      }
    }

    // If no schedule items exist, no conflicts possible
    if (allScheduleItems.length === 0) {
      return;
    }

    // Validate schedule items with new duration (ensures they don't exceed 24:00)
    this.scheduleService.validateScheduleItems(allScheduleItems, newDuration);

    // Check for teacher schedule conflicts
    // Exclude all groups from this class to avoid false positives
    // Reuse existing conflict checker
    await this.scheduleService.checkTeacherScheduleConflicts(
      teacherUserProfileId,
      allScheduleItems,
      newDuration,
      groupIds, // Exclude all groups from this class
    );

    // Check for student schedule conflicts
    // For each student, check only schedule items from groups they're in
    // Reuse existing conflict checker
    for (const [
      studentId,
      studentScheduleItems,
    ] of studentToGroupsMap.entries()) {
      await this.scheduleService.checkStudentScheduleConflicts(
        studentId,
        studentScheduleItems,
        newDuration,
        groupIds, // Exclude all groups from this class
      );
    }
  }
}
