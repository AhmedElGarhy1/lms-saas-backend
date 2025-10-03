import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { UserListQuery } from '../interfaces/user-service.interface';
import { USER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { UserFilterDto } from '../dto/user-filter.dto';
import { UserResponseDto } from '../dto/user-response.dto';

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
  ): Promise<Pagination<UserResponseDto>> {
    const { query, userId, targetUserId, centerId, targetCenterId } = params;
    const userRole = await this.accessControlHelperService.getUserRole(userId);
    const roleType = userRole?.role?.type;

    // Create query builder with proper JOINs
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role');

    if (centerId) {
      queryBuilder
        .andWhere('userRoles.centerId = :centerId', { centerId })
        .leftJoin('user.centerAccess', 'centerAccess')
        .andWhere('centerAccess.centerId = :centerId', {
          centerId,
        });
      // if user must apply access control otherwise they will see all users in the center
      if (roleType === RoleType.USER) {
        queryBuilder
          .leftJoin('user.accessTarget', 'accessTarget')
          .andWhere('accessTarget.centerId = :centerId', { centerId })
          .andWhere('accessTarget.granterUserId = :userId', { userId });
      }
    } else {
      queryBuilder.andWhere('userRoles.centerId IS NULL');
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

    let filteredItems: UserResponseDto[] = result.items;

    // Apply accessibility check if targetUserId is provided
    const usersIds = result.items.map((user) => user.id);

    if (targetUserId) {
      const accessibleUsersIds =
        await this.accessControlHelperService.getAccessibleUsersIdsForUser(
          targetUserId,
          usersIds,
          centerId,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isUserAccessible: accessibleUsersIds.includes(user.id),
        }),
      );
    }

    // apply center accessibility field
    if (targetCenterId) {
      const accessibleCenterUsersIds =
        await this.accessControlHelperService.getAccessibleUsersIdsForCenter(
          targetCenterId,
          usersIds,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isCenterAccessible: accessibleCenterUsersIds.includes(user.id),
        }),
      );
    }

    // apply role field and remove userRoles
    filteredItems = filteredItems.map((user) => {
      const userDto = Object.assign(user, {
        role: (user as any).userRoles?.[0]?.role,
      });
      delete (userDto as any).userRoles;
      return userDto;
    });

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
      const updateData: Partial<User> = {
        failedLoginAttempts: failedAttempts,
      };
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

  async clearAllUsers(): Promise<void> {
    try {
      await this.userRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      this.logger.error('Error clearing all users:', error);
      throw error;
    }
  }
}
