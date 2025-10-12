import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { USER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { UserResponseDto } from '../dto/user-response.dto';
import {
  AccessibleUsersEnum,
  PaginateUsersDto,
} from '../dto/paginate-users.dto';
import { RoleResponseDto } from '@/modules/access-control/dto/role-response.dto';
import { PaginateAdminsDto } from '../dto/paginate-admins.dto';
import { DefaultRoles } from '@/modules/access-control/constants/roles';
import { ProfileService } from '../services/profile.service';

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
    params: PaginateUsersDto,
    actorId: string,
  ): Promise<Pagination<UserResponseDto>> {
    const {
      centerId,
      userId,
      isActive,
      roleId,
      userAccess,
      roleAccess,
      centerAccess,
      displayRole,
    } = params;

    const include =
      centerId &&
      (!centerAccess || centerAccess === AccessibleUsersEnum.INCLUDE);

    // Create query builder with proper JOINs
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile');

    if (include) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM center_access ca WHERE ca."userId" = user.id AND ca."centerId" = :centerId AND ca."global" = false)',
        { centerId },
      );
      if (displayRole) {
        queryBuilder
          .leftJoinAndSelect(
            'user.userRoles',
            'userRoles',
            'userRoles.centerId = :centerId',
            { centerId },
          )
          .leftJoinAndSelect('userRoles.role', 'role');
      }
    } else {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM center_access ca WHERE ca."userId" = user.id AND ca."global" = false)',
      );
    }

    const isSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(actorId);
    const isAdmin = await this.accessControlHelperService.hasAdminRole(actorId);
    const isUser = await this.accessControlHelperService.hasUserRole(actorId);

    if (centerId) {
      const isCenterOwner = await this.accessControlHelperService.isCenterOwner(
        actorId,
        centerId,
      );

      if (isUser && !isCenterOwner) {
        queryBuilder
          .leftJoin('user.accessTarget', 'accessTarget')
          .andWhere('accessTarget.centerId = :centerId', { centerId })
          .andWhere('accessTarget.granterUserId = :actorId', {
            actorId: actorId,
          });
      }
    } else {
      if (isSuperAdmin) {
        // super admin users have no access control - can see all users
      } else if (isAdmin) {
        queryBuilder.leftJoin('user.centerAccess', 'centerAccess').andWhere(
          `centerAccess.centerId IN (
           SELECT ca."centerId" FROM center_access ca WHERE ca."userId" = :actorId AND ca."global" = true
         )`,
          { actorId },
        );
      } else if (isUser) {
        throw new BadRequestException('Access denied to this user');
      }
    }

    if (userId) {
      queryBuilder.andWhere('user.id != :userId', { userId });
      if (userAccess === AccessibleUsersEnum.INCLUDE) {
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM "user_access" AS ua
            WHERE ua."targetUserId" = "user"."id"
            AND ua."granterUserId" = :targetUserId
            ${centerId ? 'AND ua."centerId" = :centerId' : ''}
          )`,
          {
            targetUserId: userId,
            centerId,
          },
        );
      }
    }

    if (roleId && roleAccess !== AccessibleUsersEnum.ALL) {
      queryBuilder.andWhere('userRoles.roleId = :roleId', {
        roleId: roleId,
      });
    }

    // Apply filters directly
    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: isActive,
      });
    }

    const result = await this.paginate(
      params,
      USER_PAGINATION_COLUMNS,
      '/users',
      queryBuilder,
    );

    let filteredItems: UserResponseDto[] = result.items;

    if (userId && userAccess) {
      filteredItems = await this.applyUserAccess(
        filteredItems,
        userId,
        userAccess,
        centerId,
      );
    }
    if (roleId && roleAccess) {
      filteredItems = await this.applyRoleAccess(
        filteredItems,
        roleId,
        roleAccess,
        centerId,
      );
    }

    if (centerId && centerAccess) {
      filteredItems = await this.applyCenterAccess(
        filteredItems,
        centerId,
        centerAccess,
        false,
      );
    }

    if (displayRole && include) {
      filteredItems = this.prepareUsersResponse(filteredItems);
    }

    return {
      ...result,
      items: filteredItems,
    };
  }

  /**
   * Paginate admins
   * @param params - Pagination query
   * @param actorId - User ID to filter admins
   * @returns Paginated admins
   */
  async paginateAdmins(
    params: PaginateAdminsDto,
    actorId: string,
  ): Promise<Pagination<UserResponseDto>> {
    const {
      centerId,
      roleId,
      userId,
      userAccess,
      isActive,
      roleAccess,
      centerAccess,
    } = params;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .andWhere('userRoles.centerId IS NULL')
      .andWhere('role.type = :roleType', { roleType: RoleType.ADMIN });

    const isSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(actorId);
    const isAdmin = await this.accessControlHelperService.hasAdminRole(actorId);

    if (!isAdmin) throw new BadRequestException('Access denied to this user');
    if (isSuperAdmin) {
      // do nothing
    } else {
      queryBuilder
        .leftJoin('user.accessTarget', 'accessTarget')
        .andWhere('accessTarget.centerId IS NULL')
        .andWhere('accessTarget.granterUserId = :actorId', {
          actorId,
        });
    }

    if (centerId) {
      if (centerAccess !== AccessibleUsersEnum.INCLUDE) {
        queryBuilder
          .leftJoin('user.centerAccess', 'centerAccess')
          .andWhere('centerAccess.global = :global', { global: true })
          .andWhere('centerAccess.centerId = :centerId', { centerId })
          .andWhere('centerAccess.userId = :actorId', {
            actorId,
          });
      }
      if (!roleId) {
        queryBuilder.orWhere('role.name = :roleName', {
          roleName: DefaultRoles.SUPER_ADMIN,
        });
      }
    }

    if (userId) {
      queryBuilder.andWhere('user.id != :userId', { userId });
      if (userAccess === AccessibleUsersEnum.INCLUDE) {
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM "user_access" AS ua
            WHERE ua."targetUserId" = "user"."id"
            AND ua."granterUserId" = :targetUserId
            ${centerId ? 'AND ua."centerId" = :centerId' : ''}
          )`,
          {
            targetUserId: userId,
            centerId,
          },
        );
      }
    }

    if (roleId && roleAccess !== AccessibleUsersEnum.ALL) {
      queryBuilder.andWhere('role.id = :roleId', { roleId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive,
      });
    }

    const results = await this.paginate(
      params,
      USER_PAGINATION_COLUMNS,
      '/users/admin',
      queryBuilder,
    );

    let filteredItems: UserResponseDto[] = results.items;
    if (userId && userAccess) {
      filteredItems = await this.applyUserAccess(
        filteredItems,
        userId,
        userAccess,
        centerId,
      );
    }
    if (roleId && roleAccess) {
      filteredItems = await this.applyRoleAccess(
        filteredItems,
        roleId,
        roleAccess,
        centerId,
      );
    }

    if (centerId && centerAccess) {
      filteredItems = await this.applyCenterAccess(
        filteredItems,
        centerId,
        centerAccess,
        true,
      );
    }

    filteredItems = this.prepareUsersResponse(filteredItems);

    return {
      ...results,
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

  private prepareUsersResponse(users: UserResponseDto[]): UserResponseDto[] {
    return users.map((user) => {
      const userDto = Object.assign(user, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        role: user?.userRoles?.[0]?.role as RoleResponseDto,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete (userDto as any).userRoles;
      return userDto;
    });
  }

  private async applyUserAccess(
    users: UserResponseDto[],
    userId: string,
    userAccess: AccessibleUsersEnum,
    centerId?: string,
  ): Promise<UserResponseDto[]> {
    const userIds = users.map((user) => user.id);
    let filteredItems: UserResponseDto[] = users;
    if (userAccess === AccessibleUsersEnum.ALL) {
      const accessibleUsersIds =
        await this.accessControlHelperService.getAccessibleUsersIdsForUser(
          userId,
          userIds,
          centerId,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isUserAccessible: accessibleUsersIds.includes(user.id),
        }),
      );
    } else if (userAccess === AccessibleUsersEnum.INCLUDE) {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isUserAccessible: true,
        }),
      );
    }
    return filteredItems;
  }

  private async applyRoleAccess(
    users: UserResponseDto[],
    roleId: string,
    roleAccess: AccessibleUsersEnum,
    centerId?: string,
  ): Promise<UserResponseDto[]> {
    const userIds = users.map((user) => user.id);
    let filteredItems: UserResponseDto[] = users;
    if (roleAccess === AccessibleUsersEnum.ALL) {
      const accessibleUsersIds =
        await this.accessControlHelperService.getAccessibleUsersIdsForRole(
          roleId,
          userIds,
          centerId,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isRoleAccessible: accessibleUsersIds.includes(user.id),
        }),
      );
    } else {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isRoleAccessible: true,
        }),
      );
    }
    return filteredItems;
  }

  private async applyCenterAccess(
    users: UserResponseDto[],
    centerId: string,
    centerAccess: AccessibleUsersEnum,
    global: boolean,
  ): Promise<UserResponseDto[]> {
    const userIds = users.map((user) => user.id);
    let filteredItems: UserResponseDto[] = users;
    if (centerAccess === AccessibleUsersEnum.ALL) {
      const accessibleUsersIds =
        await this.accessControlHelperService.getAccessibleUsersIdsForCenter(
          centerId,
          userIds,
          global,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isCenterAccessible: accessibleUsersIds.includes(user.id),
        }),
      );
    } else {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isCenterAccessible: true,
        }),
      );
    }
    return filteredItems;
  }
}
