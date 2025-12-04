import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { ClassesRepository } from '../repositories/classes.repository';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ScheduleService } from './schedule.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Class } from '../entities/class.entity';
import {
  ResourceNotFoundException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Injectable()
export class GroupValidationService extends BaseService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly userProfileService: UserProfileService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly scheduleService: ScheduleService,
  ) {
    super();
  }

  async validateGroupCreation(
    dto: CreateGroupDto,
    actor: ActorUser,
    centerId: string,
  ): Promise<Class> {
    // Validate class exists and belongs to center
    const classEntity = await this.validateClassForGroup(dto.classId, centerId);

    // Validate schedule items
    this.scheduleService.validateScheduleItems(dto.scheduleItems);

    // Validate schedule items are within class date range
    this.validateScheduleWithinClassDateRange(dto.scheduleItems, classEntity);

    // Check for duplicate student assignments
    const uniqueStudentIds = new Set(dto.studentUserProfileIds);
    if (uniqueStudentIds.size !== dto.studentUserProfileIds.length) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Duplicate student assignments are not allowed',
      });
    }

    // Check for teacher schedule conflicts
    await this.scheduleService.checkTeacherScheduleConflicts(
      classEntity.teacherUserProfileId,
      dto.scheduleItems,
      undefined,
      centerId,
    );

    // Validate students
    await this.validateStudents(dto.studentUserProfileIds, centerId);

    return classEntity;
  }

  async validateGroupUpdate(
    groupId: string,
    dto: UpdateGroupDto,
    actor: ActorUser,
    centerId: string,
    currentGroup: { classId: string; branchId: string },
  ): Promise<Class> {
    // Get class for validation
    const classEntity = await this.classesRepository.findOne(
      currentGroup.classId,
    );
    if (!classEntity) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.class',
        identifier: 'ID',
        value: currentGroup.classId,
      });
    }

    // Validate schedule items if provided
    if (dto.scheduleItems) {
      this.scheduleService.validateScheduleItems(dto.scheduleItems);
      this.validateScheduleWithinClassDateRange(dto.scheduleItems, classEntity);

      // Check for teacher schedule conflicts
      await this.scheduleService.checkTeacherScheduleConflicts(
        classEntity.teacherUserProfileId,
        dto.scheduleItems,
        groupId,
        centerId,
      );
    }

    // Validate students if provided
    if (dto.studentUserProfileIds) {
      // Check for duplicate student assignments
      const uniqueStudentIds = new Set(dto.studentUserProfileIds);
      if (uniqueStudentIds.size !== dto.studentUserProfileIds.length) {
        throw new BusinessLogicException('t.errors.validationFailed', {
          reason: 'Duplicate student assignments are not allowed',
        });
      }

      await this.validateStudents(dto.studentUserProfileIds, centerId);
    }

    return classEntity;
  }

  async validateClassForGroup(
    classId: string,
    centerId: string,
  ): Promise<Class> {
    const classEntity =
      await this.classesRepository.findClassWithRelations(classId);
    if (!classEntity || classEntity.centerId !== centerId) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.class',
        identifier: 'ID',
        value: classId,
      });
    }
    return classEntity;
  }

  async validateStudents(
    studentUserProfileIds: string[],
    centerId: string,
  ): Promise<void> {
    for (const studentUserProfileId of studentUserProfileIds) {
      const studentProfile =
        await this.userProfileService.findOne(studentUserProfileId);
      if (!studentProfile) {
        throw new ResourceNotFoundException('t.errors.notFound.withId', {
          resource: 't.common.resources.profile',
          identifier: 'ID',
          value: studentUserProfileId,
        });
      }

      if (studentProfile.profileType !== ProfileType.STUDENT) {
        throw new BusinessLogicException('t.errors.validationFailed', {
          reason: 'Student profile must be of type STUDENT',
        });
      }

      // Validate student has branch access if branchId is provided
      if (centerId) {
        await this.accessControlHelperService.validateCenterAccess({
          userProfileId: studentUserProfileId,
          centerId,
        });
      }
    }
  }

  validateScheduleWithinClassDateRange(
    scheduleItems: ScheduleItemDto[],
    classEntity: Class,
  ): void {
    if (!classEntity.startDate) {
      return; // No start date, skip validation
    }

    // Note: Schedule items don't have specific dates, they're recurring
    // This validation ensures the class is active during the schedule period
    // In a production system, you might want to validate against specific dates
    // For now, we just ensure the class has valid dates
    if (classEntity.endDate) {
      const now = new Date();
      if (now > classEntity.endDate) {
        throw new BusinessLogicException('t.errors.validationFailed', {
          reason: 'Cannot create schedule for a class that has ended',
        });
      }
    }
  }
}
