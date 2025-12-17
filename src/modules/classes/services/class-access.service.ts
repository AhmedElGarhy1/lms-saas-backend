import { Injectable, Logger } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { InsufficientPermissionsException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { ClassStaffRepository } from '../repositories/class-staff.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';

@Injectable()
export class ClassAccessService extends BaseService {
  private readonly logger: Logger = new Logger(ClassAccessService.name);

  constructor(
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
  ) {
    super();
  }

  /**
   * Check if a user has ClassStaff assignment for a specific class.
   * Returns true if ClassStaff assignment exists and is active (leftAt is null).
   *
   * @param userProfileId - The user profile ID
   * @param classId - The class ID
   * @returns true if user has active ClassStaff assignment, false otherwise
   */
  async canAccessClass(
    userProfileId: string,
    classId: string,
  ): Promise<boolean> {
    const classStaff = await this.classStaffRepository.findClassStaff(
      userProfileId,
      classId,
    );

    if (!classStaff || classStaff.leftAt !== null) {
      return false;
    }

    return true;
  }

  /**
   * Validates that a user has ClassStaff assignment for a specific class.
   * Throws InsufficientPermissionsException if access is denied.
   *
   * @param userProfileId - The user profile ID
   * @param classId - The class ID
   * @throws InsufficientPermissionsException if user doesn't have ClassStaff assignment
   */
  async validateClassAccess(
    userProfileId: string,
    classId: string,
  ): Promise<void> {
    const canAccess = await this.canAccessClass(userProfileId, classId);
    if (!canAccess) {
      this.logger.warn('Class access validation failed', {
        userProfileId,
        classId,
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

    // Batch fetch all ClassStaff assignments for the given class and profile IDs
    const classStaffs = await this.classStaffRepository.findMany({
      where: {
        classId,
        userProfileId: In(targetProfileIds),
        leftAt: IsNull(),
      },
    });

    // Return only the profile IDs that have active access
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

    // Batch fetch all GroupStudent assignments for the given class and profile IDs
    const groupStudents = await this.groupStudentsRepository.findMany({
      where: {
        classId,
        studentUserProfileId: In(targetProfileIds),
        leftAt: IsNull(),
      },
    });

    // Return only the profile IDs that have active access
    return groupStudents.map((gs) => gs.studentUserProfileId);
  }
}
