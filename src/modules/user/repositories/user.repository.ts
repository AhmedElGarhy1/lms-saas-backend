import { BadRequestException, Injectable } from '@nestjs/common';
import { In, IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Role } from '@/modules/access-control/entities';
import { UserListQuery } from '../interfaces/user-service.interface';
import { USER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { PaginationUtils } from '@/shared/common/utils/pagination.utils';
import { UserFilterDto } from '../dto/user-filter.dto';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(userRepository, logger);
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { email },
      });
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  // Convenience methods with proper, safe queries
  async findWithRelations(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'userRoles', 'userRoles.role'],
    });

    return user;
  }

  /**
   * Paginate users in a specific center using JOINs for better performance
   * @param query - Pagination query
   * @param centerId - Center ID to filter users
   * @param userId - User ID to filter users
   * @param options - Options for pagination
   * @param options.isActive - Whether to filter active users
   * @param options.targetUserId - User ID to filter users
   * @returns Paginated users in the specified center
   */
  async paginateUsers(
    params: UserListQuery,
    roleType: RoleType,
  ): Promise<Pagination<User>> {
    const { query, userId, targetUserId, centerId, targetCenterId } = params;

    // Create query builder with proper JOINs
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (centerId) {
      queryBuilder
        .leftJoin('user.centers', 'centers')
        .andWhere('centers.centerId = :centerId', {
          centerId: centerId ?? null,
        });
      // if user must apply access control otherwise they will see all users in the center
      if (roleType === RoleType.USER) {
        queryBuilder
          .leftJoin('user.accessTarget', 'accessTarget')
          .andWhere('accessTarget.centerId = :centerId', { centerId })
          .andWhere('accessTarget.granterUserId = :userId', { userId });
      }
    } else {
      if (roleType == RoleType.SUPER_ADMIN) {
        // no access control
      } else if (roleType === RoleType.ADMIN) {
        queryBuilder
          .leftJoin('user.accessTarget', 'accessTarget')
          .andWhere('accessTarget.centerId IS NULL')
          .andWhere('accessTarget.granterUserId = :userId', { userId });
      } else {
        throw new BadRequestException('Access denied to this user');
      }
    }

    // Add JOINs for relations
    queryBuilder.leftJoinAndSelect('user.profile', 'profile');

    // Filter by target user (exclude)
    if (targetUserId) {
      queryBuilder.andWhere('user.id != :targetUserId', { targetUserId });
    }

    // Apply filters with field mapping
    if (query.filter) {
      this.applyFilters(
        queryBuilder,
        query.filter,
        UserFilterDto.getFieldMapping(),
      );
    }
    // Use the base repository paginate method with custom query builder
    const result = await this.paginate(
      {
        page: query.page,
        limit: query.limit,
        search: query.search,
        sortBy: query.sortBy,
        searchableColumns: USER_PAGINATION_COLUMNS.searchableColumns,
        sortableColumns: USER_PAGINATION_COLUMNS.sortableColumns,
        defaultSortBy: USER_PAGINATION_COLUMNS.defaultSortBy,
        route: '/users',
      },
      queryBuilder,
    );

    let filteredItems = result.items;

    // Apply accessibility check if targetUserId is provided
    const usersIds = filteredItems.map((user) => user.id);
    if (targetUserId) {
      const accessibleUsersIds =
        await this.accessControlHelperService.getAccessibleUsersIdsForUser(
          targetUserId,
          usersIds,
          centerId,
        );

      filteredItems = filteredItems.map((user) => ({
        ...user,
        isUserAccessible: accessibleUsersIds.some(
          (accessibleUserId) => accessibleUserId === user.id,
        ),
      }));
    }

    // apply center accessibility field
    if (targetCenterId) {
      const accessibleUsersIds =
        await this.accessControlHelperService.getAccessibleUsersIdsForCenter(
          targetCenterId,
          usersIds,
        );

      filteredItems = filteredItems.map((user) => ({
        ...user,
        isCenterAccessible: accessibleUsersIds.some(
          (accessibleUserId) => accessibleUserId === user.id,
        ),
      }));
    }

    return {
      ...result,
      items: filteredItems,
    };
  }

  async updateUserTwoFactor(
    userId: string,
    twoFactorSecret: string | null,
    twoFactorEnabled: boolean,
  ): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        twoFactorSecret: twoFactorSecret || undefined,
        twoFactorEnabled,
      });
    } catch (error) {
      this.logger.error(
        `Error updating user two-factor settings ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async updateFailedLoginAttempts(
    userId: string,
    failedAttempts: number,
    lockoutUntil?: Date,
  ): Promise<void> {
    try {
      const updateData: any = { failedLoginAttempts: failedAttempts };
      if (lockoutUntil) {
        updateData.lockoutUntil = lockoutUntil;
      }

      await this.userRepository.update(userId, updateData);
    } catch (error) {
      this.logger.error(
        `Error updating failed login attempts ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        failedLoginAttempts: 0,
        lockoutUntil: undefined,
      });
    } catch (error) {
      this.logger.error(
        `Error resetting failed login attempts ${userId}:`,
        error,
      );
      throw error;
    }
  }

  // Methods for user activation service
  async findActiveUsersInCenter(centerId: string): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: {
          centers: {
            centerId,
            isActive: true,
          },
        },
        relations: ['profile', 'centers', 'centers.center', 'userRoles.role'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding active users in center ${centerId}:`,
        error,
      );
      throw error;
    }
  }

  async findActiveUsers(): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { isActive: true },
        relations: ['profile', 'userRoles.role'],
      });
    } catch (error) {
      this.logger.error('Error finding active users:', error);
      throw error;
    }
  }

  async findInactiveUsersInCenter(centerId: string): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: {
          centers: {
            centerId,
            isActive: false,
          },
        },
        relations: ['profile', 'centers', 'centers.center', 'userRoles.role'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding inactive users in center ${centerId}:`,
        error,
      );
      throw error;
    }
  }

  async findInactiveUsers(): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { isActive: false },
        relations: ['profile', 'userRoles.role'],
      });
    } catch (error) {
      this.logger.error('Error finding inactive users:', error);
      throw error;
    }
  }

  async clearAllUsers(): Promise<void> {
    try {
      await this.userRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      this.logger.error('Error clearing all users:', error);
      throw error;
    }
  }
}
