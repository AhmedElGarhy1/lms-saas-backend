import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ClassStaffRepository } from '../repositories/class-staff.repository';
import { ClassesRepository } from '../repositories/classes.repository';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ClassAccessService } from './class-access.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import {
  ResourceNotFoundException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { ClassStaff } from '../entities/class-staff.entity';
import { Class } from '../entities/class.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';

@Injectable()
export class ClassStaffService extends BaseService {
  constructor(
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly classesRepository: ClassesRepository,
    private readonly userProfileService: UserProfileService,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly classAccessService: ClassAccessService,
  ) {
    super();
  }

  /**
   * Gets all staff assignments for a specific class.
   *
   * @param classId - The class ID
   * @param actor - The user performing the action
   * @returns Array of ClassStaff assignments
   * @throws ResourceNotFoundException if class doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have permission
   */
  async getClassStaff(
    classId: string,
    actor: ActorUser,
  ): Promise<ClassStaff[]> {
    // Verify class exists and actor has access
    const classEntity = await this.classesRepository.findOne(classId);
    if (!classEntity) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.class',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }

    // Validate actor has access to the class's center
    this.validateResourceAccess(
      classEntity,
      classId,
      actor,
      't.resources.class',
    );

    return this.classStaffRepository.findByClassId(classId);
  }

  /**
   * Assigns a profile to a class.
   * Validates user access, profile type, center access, and creates class staff assignment.
   *
   * @param data - ClassStaffAccessDto containing userProfileId, classId, and centerId
   * @param actor - The user performing the action
   * @returns Created ClassStaff assignment
   * @throws ResourceNotFoundException if profile doesn't exist
   * @throws BusinessLogicException if profile is not STAFF, doesn't have center access, or already assigned
   */
  async assignProfileToClass(
    data: ClassStaffAccessDto,
    actor: ActorUser,
  ): Promise<ClassStaff> {
    const centerId = data.centerId ?? actor.centerId ?? '';

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId,
    });

    // Validate that profile type is STAFF
    const profile = await this.userProfileService.findOne(data.userProfileId);
    if (!profile) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.profile',
      });
    }

    // Positive check: must be STAFF
    if (profile.profileType !== ProfileType.STAFF) {
      throw new BusinessLogicException('t.messages.onlyForStaffAndAdmin', {
        resource: 't.resources.classStaffAccess',
      });
    }

    // Verify staff has center access
    const hasCenterAccess =
      await this.accessControlHelperService.canCenterAccess({
        userProfileId: data.userProfileId,
        centerId,
      });

    if (!hasCenterAccess) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        reason:
          'Staff must have center access before being assigned to a class',
      });
    }

    const canAccess = await this.classAccessService.canAccessClass(
      data.userProfileId,
      data.classId,
    );
    if (canAccess) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.staff',
        state: 'assigned to class',
      });
    }

    // Create new assignment
    const classStaff =
      await this.classStaffRepository.grantClassStaffAccess(data);

    return classStaff;
  }

  /**
   * Removes a profile from a class.
   * Validates user access and removes class staff assignment.
   *
   * @param data - ClassStaffAccessDto containing userProfileId, classId, and centerId
   * @param actor - The user performing the action
   * @returns Removed ClassStaff assignment
   */
  async removeUserFromClass(
    data: ClassStaffAccessDto,
    actor: ActorUser,
  ): Promise<ClassStaff> {
    const centerId = data.centerId ?? actor.centerId ?? '';

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId,
    });

    await this.classAccessService.validateClassAccess(
      data.userProfileId,
      data.classId,
    );

    const result = await this.classStaffRepository.revokeClassStaffAccess(data);

    return result;
  }
}
