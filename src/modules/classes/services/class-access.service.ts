import { Injectable, Logger } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { InsufficientPermissionsException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { ClassStaffRepository } from '../repositories/class-staff.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { ClassStaff } from '../entities/class-staff.entity';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ClassesRepository } from '../repositories/classes.repository';

@Injectable()
export class ClassAccessService extends BaseService {
  private readonly logger: Logger = new Logger(ClassAccessService.name);

  constructor(
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly userProfileService: UserProfileService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly classesRepository: ClassesRepository,
  ) {
    super();
  }

  // class access methods

  /**
   * Find ClassStaff assignment for a specific user and class.
   *
   * @param data - ClassStaffAccessDto
   * @param includeLeft - Whether to include assignments where leftAt is not null (default: false)
   * @returns ClassStaff assignment or null if not found
   */
  async findClassAccess(
    data: ClassStaffAccessDto,
    includeLeft: boolean = false,
  ): Promise<ClassStaff | null> {
    return this.classStaffRepository.findClassStaffAccess(data, includeLeft);
  }

  /**
   * Check if a user has ClassStaff assignment for a specific class.
   * Returns true if user is super admin or has active ClassStaff assignment.
   *
   * @param data - ClassStaffAccessDto
   * @param includeLeft - Whether to include assignments where leftAt is not null (default: false)
   * @returns true if user has access, false otherwise
   */
  async canClassAccess(
    data: ClassStaffAccessDto,
    includeLeft: boolean = false,
  ): Promise<boolean> {
    const { userProfileId, classId } = data;
    const isAdmin =
      await this.accessControlHelperService.isAdmin(userProfileId);
    if (isAdmin) {
      return true;
    }
    const classEntity = await this.classesRepository.findOneOrThrow(classId);
    const isOwner = await this.accessControlHelperService.isCenterOwner(
      userProfileId,
      classEntity.centerId,
    );

    if (isOwner) {
      return true;
    }

    const classAccess = await this.findClassAccess(data, includeLeft);
    if (!classAccess) {
      return false;
    }

    return includeLeft || classAccess.leftAt === null;
  }

  /**
   * Validates that a user has ClassStaff assignment for a specific class.
   * Only validates if the user is STAFF (non-STAFF users don't need class access validation).
   * Throws InsufficientPermissionsException if access is denied.
   *
   * @param data - ClassStaffAccessDto
   * @param config - Configuration options for validation
   * @param config.includeLeft - Whether to include assignments where leftAt is not null (default: false)
   * @throws InsufficientPermissionsException if user doesn't have ClassStaff assignment
   */
  async validateClassAccess(
    data: ClassStaffAccessDto,
    config: {
      includeLeft?: boolean;
    } = {
      includeLeft: false,
    },
  ): Promise<void> {
    const profile = await this.userProfileService.findOne(data.userProfileId);
    if (!profile) {
      return;
    }
    if (profile.profileType !== ProfileType.STAFF) {
      return;
    }

    const canAccess = await this.canClassAccess(data, config.includeLeft);
    if (!canAccess) {
      this.logger.warn('Class access validation failed', {
        userProfileId: data.userProfileId,
        classId: data.classId,
      });
      throw new InsufficientPermissionsException(
        't.messages.actionUnauthorized',
        {
          action: 't.buttons.view',
          resource: 't.resources.class',
        },
      );
    }
  }

  /**
   * Get accessible staff profile IDs for a class.
   * Filters an array of profile IDs to return only those that have class staff access (via ClassStaff).
   *
   * @param classId - The class ID
   * @param targetProfileIds - Array of profile IDs to check
   * @returns Array of profile IDs that have class staff access
   */
  async getAccessibleStaffProfileIdsForClass(
    classId: string,
    targetProfileIds: string[],
  ): Promise<string[]> {
    if (!targetProfileIds || targetProfileIds.length === 0) {
      return [];
    }

    const classStaffs = await this.classStaffRepository.findMany({
      where: {
        classId,
        userProfileId: In(targetProfileIds),
        leftAt: IsNull(),
      },
    });

    return classStaffs.map((cs) => cs.userProfileId);
  }

  /**
   * Get accessible student profile IDs for a class.
   * Filters an array of profile IDs to return only those that have class access via groups (via GroupStudent).
   *
   * @param classId - The class ID
   * @param targetProfileIds - Array of profile IDs to check
   * @returns Array of profile IDs that have class access through groups
   */
  async getAccessibleStudentProfileIdsForClass(
    classId: string,
    targetProfileIds: string[],
  ): Promise<string[]> {
    if (!targetProfileIds || targetProfileIds.length === 0) {
      return [];
    }

    const groupStudents = await this.groupStudentsRepository.findMany({
      where: {
        classId,
        studentUserProfileId: In(targetProfileIds),
        leftAt: IsNull(),
      },
    });

    return groupStudents.map((gs) => gs.studentUserProfileId);
  }
}
