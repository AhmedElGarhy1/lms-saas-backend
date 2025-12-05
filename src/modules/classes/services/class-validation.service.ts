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

@Injectable()
export class ClassValidationService extends BaseService {
  constructor(
    private readonly levelsRepository: LevelsRepository,
    private readonly subjectsRepository: SubjectsRepository,
    private readonly branchesRepository: BranchesRepository,
    private readonly userProfileService: UserProfileService,
    private readonly accessControlHelperService: AccessControlHelperService,
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
  }

  async validateClassUpdate(
    classId: string,
    dto: UpdateClassDto,
    actor: ActorUser,
    centerId: string,
    currentClass: { branchId: string; startDate: Date; endDate?: Date },
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
}
