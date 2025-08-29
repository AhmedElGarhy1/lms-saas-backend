import { Injectable } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Role } from '@/modules/access-control/entities';
import { UserListQuery } from '../services/user.service';
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
        select: [
          'id',
          'email',
          'password',
          'isActive',
          'twoFactorEnabled',
          'twoFactorSecret',
          'failedLoginAttempts',
          'lockoutUntil',
        ],
      });
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  async findUserWithAuthRelations(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { email },
        select: [
          'id',
          'email',
          'password',
          'name',
          'isActive',
          'twoFactorEnabled',
          'twoFactorSecret',
          'failedLoginAttempts',
          'lockoutUntil',
        ],
      });
    } catch (error) {
      this.logger.error(
        `Error finding user with auth relations ${email}:`,
        error,
      );
      throw error;
    }
  }

  // Convenience methods with proper, safe queries
  async findUserForProfile(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
        relations: [
          'profile',
          'centers',
          'centers.center',
          'userRoles',
          'userRoles.role',
        ],
      });
    } catch (error) {
      this.logger.error(`Error finding user for profile ${userId}:`, error);
      throw error;
    }
  }

  async findUserBasic(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'name', 'email', 'isActive', 'createdAt'],
      });
    } catch (error) {
      this.logger.error(`Error finding basic user ${userId}:`, error);
      throw error;
    }
  }

  async findUserWithProfile(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });
    } catch (error) {
      this.logger.error(`Error finding user with profile ${userId}:`, error);
      throw error;
    }
  }

  async findUserWithPermissions(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
        relations: ['userRoles', 'userRoles.role'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding user with permissions ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async findUserWithCenters(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
        relations: ['centers', 'centers.center', 'centers.role'],
      });
    } catch (error) {
      this.logger.error(`Error finding user with centers ${userId}:`, error);
      throw error;
    }
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
  async paginateUsersInCenter(
    params: UserListQuery,
    roleType: RoleType,
  ): Promise<Pagination<User>> {
    const { query, userId, targetUserId, centerId } = params;

    // Create query builder with proper JOINs
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (roleType === RoleType.USER) {
      // join with user access
      queryBuilder
        .leftJoin('user.accessGranter', 'accessGranter')
        .andWhere('accessGranter.centerId = :centerId', { centerId });
    }

    // Add JOINs for relations
    queryBuilder
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role');

    // Filter by center
    if (centerId) {
      queryBuilder.leftJoin('user.centers', 'centers');
      queryBuilder.andWhere('centers.centerId = :centerId', { centerId });
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

    // Apply access control filtering
    const userRole =
      await this.accessControlHelperService.getUserHighestRole(userId);

    let filteredItems = result.items;

    if (userRole?.role?.type === RoleType.USER) {
      // Filter results based on access control
      filteredItems = filteredItems.filter((user) => {
        return user.userRoles?.some(
          (userRole) =>
            userRole.role?.type === RoleType.CENTER_ADMIN ||
            userRole.role?.type === RoleType.USER,
        );
      });
    }

    // Apply accessibility check if targetUserId is provided
    if (targetUserId) {
      const usersIds = filteredItems.map((user) => user.id);
      const accessibleUsersIds =
        await this.accessControlHelperService.getAccessibleUsersIdsByIds(
          targetUserId,
          usersIds,
        );

      filteredItems = filteredItems.map((user) => ({
        ...user,
        isAccessible: accessibleUsersIds.some(
          (accessibleUserId) => accessibleUserId === user.id,
        ),
      }));
    }

    // Transform the data to have roles array
    const transformedData = this.transformUserRoles(filteredItems);

    return {
      ...result,
      items: transformedData,
    };
  }

  /**
   * Paginate admins using JOINs for better performance
   * @param query - Pagination query
   * @param userId - User ID to filter users
   * @param options - Options for pagination
   * @param options.isActive - Whether to filter active users
   * @param options.targetUserId - User ID to filter users
   * @returns Paginated admins
   */
  async paginateAdmins(
    params: Omit<UserListQuery, 'centerId'>,
    currentUserRole: RoleType,
  ): Promise<Pagination<User>> {
    const { query, userId, targetUserId } = params;
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (targetUserId) {
      queryBuilder.andWhere('user.id != :targetUserId', { targetUserId });
    }

    // Add JOINs for relations
    queryBuilder
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .andWhere('role.type IN (:...roleTypes)', {
        roleTypes: ['SUPER_ADMIN', 'ADMIN'],
      });

    // Apply filters with field mapping (after JOINs and basic WHERE)
    if (query.filter) {
      this.applyFilters(
        queryBuilder,
        query.filter,
        UserFilterDto.getFieldMapping(),
      );
    }

    // Add access control filtering for non-SUPER_ADMIN users
    if (currentUserRole !== RoleType.SUPER_ADMIN) {
      queryBuilder
        .leftJoin('user.accessTarget', 'accessTarget')
        .andWhere('accessTarget.granterUserId = :userId', { userId });
    }

    // Use the base repository paginate method
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

    if (targetUserId) {
      const targetUserHighestRole =
        await this.accessControlHelperService.getUserHighestRole(targetUserId);

      if (targetUserHighestRole?.role?.type === RoleType.SUPER_ADMIN) {
        filteredItems = result.items.map((user) => ({
          ...user,
          isAccessible: true,
        }));
      } else {
        const usersIds = result.items.map((user) => user.id);
        const accessibleUsersIds =
          await this.accessControlHelperService.getAccessibleUsersIdsByIds(
            targetUserId,
            usersIds,
          );

        filteredItems = filteredItems.map((user) => ({
          ...user,
          isAccessible: accessibleUsersIds.includes(user.id),
        }));
      }
    }

    // Transform the data to have roles array
    const transformedData = this.transformUserRoles(filteredItems);

    return {
      ...result,
      items: transformedData,
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

  /**
   * Transform user data to have roles array instead of userRoles
   */
  private transformUserRoles(users: User[]): (User & { roles: Role[] })[] {
    return users.map((user: User) => {
      const _users = {
        ...user,
        roles:
          user.userRoles?.map((userRole: any) => ({
            ...userRole.role,
            centerId: userRole.centerId,
            isActive: userRole.isActive,
          })) || [],
      };
      delete (_users as any).userRoles;
      return _users;
    });
  }
}
