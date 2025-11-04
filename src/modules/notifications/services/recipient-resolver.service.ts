import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { User } from '@/modules/user/entities/user.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RecipientInfo } from '../types/recipient-info.interface';
import { RecipientQueryOptions } from '../types/recipient-query-options.interface';
import { LoggerService } from '@/shared/services/logger.service';

@Injectable()
export class RecipientResolverService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get all active members of a center with optional profile type filtering
   * @param centerId - Center ID
   * @param options - Optional query options (profileTypes, excludeUserIds, skipSelfUserId)
   * @returns Array of recipient information
   */
  async getCenterMembers(
    centerId: string,
    options?: RecipientQueryOptions,
  ): Promise<RecipientInfo[]> {
    // Destructure options
    const { profileTypes, excludeUserIds, skipSelfUserId } = options || {};

    // Merge skipSelfUserId into excludeUserIds if provided
    const finalExcludeUserIds = skipSelfUserId
      ? [...(excludeUserIds || []), skipSelfUserId]
      : excludeUserIds;

    try {

      const query = this.dataSource
        .createQueryBuilder()
        .select('DISTINCT u.id', 'userId')
        .addSelect('up.id', 'profileId')
        .addSelect('u.email', 'email')
        .addSelect('up.profileType', 'profileType')
        .from(CenterAccess, 'ca')
        .innerJoin(UserProfile, 'up', 'ca.userProfileId = up.id')
        .innerJoin(User, 'u', 'up.userId = u.id')
        .where('ca.centerId = :centerId', { centerId })
        .andWhere('ca.isActive = :isActive', { isActive: true })
        .andWhere('ca.deletedAt IS NULL')
        .andWhere('up.isActive = :profileActive', { profileActive: true })
        .andWhere('up.deletedAt IS NULL')
        .andWhere('u.isActive = :userActive', { userActive: true })
        .andWhere('u.deletedAt IS NULL');

      if (profileTypes && profileTypes.length > 0) {
        query.andWhere('up.profileType IN (:...profileTypes)', { profileTypes });
      }

      if (finalExcludeUserIds && finalExcludeUserIds.length > 0) {
        query.andWhere('u.id NOT IN (:...excludeUserIds)', {
          excludeUserIds: finalExcludeUserIds,
        });
      }

      const results = await query.getRawMany();

      return results.map((row) => ({
        userId: row.userId,
        profileId: row.profileId,
        email: row.email || '',
        profileType: row.profileType as ProfileType,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get center members for center ${centerId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        'RecipientResolverService',
        {
          centerId,
          options,
        },
      );
      throw error;
    }
  }

  /**
   * Get all students associated with a teacher
   * @param teacherProfileId - Teacher profile ID
   * @param options - Optional query options (excludeUserIds, skipSelfUserId)
   * @returns Array of recipient information
   */
  async getTeacherStudents(
    teacherProfileId: string,
    options?: RecipientQueryOptions,
  ): Promise<RecipientInfo[]> {
    // TODO: Implement when teacher-student relationship is defined
    // This would join through a teacher_student or class_student relationship table
    this.logger.warn(
      'getTeacherStudents not yet implemented',
      'RecipientResolverService',
      { teacherProfileId },
    );
    return [];
  }

  /**
   * Get all users accessible by a manager (subordinates)
   * @param managerProfileId - Manager profile ID
   * @param centerId - Center ID for context
   * @param options - Optional query options (excludeUserIds, skipSelfUserId)
   * @returns Array of recipient information
   */
  async getAccessibleUsers(
    managerProfileId: string,
    centerId: string,
    options?: RecipientQueryOptions,
  ): Promise<RecipientInfo[]> {
    // TODO: Implement when user_access or hierarchy relationships are defined
    // This would join through user_access table where granter is the manager
    this.logger.warn(
      'getAccessibleUsers not yet implemented',
      'RecipientResolverService',
      { managerProfileId, centerId },
    );
    return [];
  }
}

