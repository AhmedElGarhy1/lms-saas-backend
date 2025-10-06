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
    const { centerId } = params;
    const userRole = await this.accessControlHelperService.getUserRole(actorId);
    const roleType = userRole?.role?.type;

    // Create query builder with proper JOINs
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile');

    if (centerId) {
      // Filter users who have roles in this center (centerId in userRoles = center access)
      if (
        !params.roleAccess ||
        params.roleAccess === AccessibleUsersEnum.INCLUDE
      ) {
        queryBuilder
          .leftJoinAndSelect(
            'user.userRoles',
            'userRoles',
            'userRoles.centerId = :centerId',
            { centerId },
          )
          .leftJoinAndSelect('userRoles.role', 'role')
          .andWhere('role.centerId = :centerId', { centerId });
      }

      // if user must apply access control otherwise they will see all users in the center
      if (roleType === RoleType.USER) {
        queryBuilder
          .leftJoin('user.accessTarget', 'accessTarget')
          .andWhere('accessTarget.centerId = :centerId', { centerId })
          .andWhere('accessTarget.granterUserId = :actorId', {
            actorId: actorId,
          });
      }
    } else {
      //  Filter users who have global roles (centerId IS NULL in userRoles)
      if (params.roleAccess === AccessibleUsersEnum.INCLUDE) {
        queryBuilder.andWhere('userRoles.centerId IS NULL');
      }
      if (roleType == RoleType.SUPER_ADMIN) {
        // no access control
      } else if (roleType === RoleType.ADMIN) {
        queryBuilder
          .leftJoin('user.accessTarget', 'actorAccess')
          .andWhere('actorAccess.centerId IS NULL')
          .andWhere('actorAccess.granterUserId = :actorId', {
            actorId: actorId,
          });
      } else {
        throw new BadRequestException('Access denied to this user');
      }
    }

    if (params.userId) {
      if (params.userAccess === AccessibleUsersEnum.INCLUDE) {
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM "user_access" AS ua
            WHERE ua."targetUserId" = "user"."id"
            AND ua."granterUserId" = :targetUserId
            ${centerId ? 'AND ua."centerId" = :centerId' : ''}
          )`,
          {
            targetUserId: params.userId,
            centerId,
          },
        );
      }
    }

    if (params.roleId) {
      if (params.roleAccess === AccessibleUsersEnum.INCLUDE) {
        queryBuilder.andWhere('userRoles.roleId = :roleId', {
          roleId: params.roleId,
        });
      }
    }

    // Apply filters directly
    if (params.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: params.isActive,
      });
    }

    const result = await this.paginate(
      params,
      USER_PAGINATION_COLUMNS,
      '/users',
      queryBuilder,
    );

    let filteredItems: UserResponseDto[] = result.items;

    // Apply accessibility check if targetUserId is provided
    const usersIds = result.items.map((user) => user.id);

    if (params.userId && params.userAccess) {
      if (params.userAccess === AccessibleUsersEnum.ALL) {
        const accessibleUsersIds =
          await this.accessControlHelperService.getAccessibleUsersIdsForUser(
            params.userId,
            usersIds,
            centerId,
          );
        console.log('accessibleUsersIds', accessibleUsersIds);
        filteredItems = filteredItems.map((user) =>
          Object.assign(user, {
            isUserAccessible: accessibleUsersIds.includes(user.id),
          }),
        );
      } else if (params.userAccess === AccessibleUsersEnum.INCLUDE) {
        filteredItems = filteredItems.map((user) =>
          Object.assign(user, {
            isUserAccessible: true,
          }),
        );
      }
    }

    // apply center accessibility field
    if (centerId && params.centerAccess) {
      if (params.centerAccess === AccessibleUsersEnum.ALL) {
        const accessibleCenterUsersIds =
          await this.accessControlHelperService.getAccessibleUsersIdsForCenter(
            centerId,
            usersIds,
          );
        filteredItems = filteredItems.map((user) =>
          Object.assign(user, {
            isCenterAccessible: accessibleCenterUsersIds.includes(user.id),
          }),
        );
      } else if (params.centerAccess === AccessibleUsersEnum.INCLUDE) {
        filteredItems = filteredItems.map((user) =>
          Object.assign(user, {
            isCenterAccessible: true,
          }),
        );
      }
    }

    if (params.roleId) {
      if (params.roleAccess === AccessibleUsersEnum.ALL) {
        const accessibleUsersIds =
          await this.accessControlHelperService.getAccessibleUsersIdsForRole(
            params.roleId,
            usersIds,
            centerId,
          );
        filteredItems = filteredItems.map((user) =>
          Object.assign(user, {
            isRoleAccessible: accessibleUsersIds.includes(user.id),
          }),
        );
      } else if (params.roleAccess === AccessibleUsersEnum.INCLUDE) {
        filteredItems = filteredItems.map((user) =>
          Object.assign(user, {
            isRoleAccessible: true,
          }),
        );
      }
    }

    // apply role field and remove userRoles
    // TODO: fix this later
    filteredItems = filteredItems.map((user) => {
      const userDto = Object.assign(user, {
        role: (user as any).userRoles?.[0]?.role as RoleResponseDto,
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
