import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { USER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { UserResponseDto } from '../dto/user-response.dto';
import {
  AccessibleUsersEnum,
  PaginateUsersDto,
} from '../dto/paginate-users.dto';
import { RoleResponseDto } from '@/modules/access-control/dto/role-response.dto';
import { PaginateAdminsDto } from '../dto/paginate-admins.dto';
import { DefaultRoles } from '@/modules/access-control/constants/roles';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof User {
    return User;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.getRepository().findOne({
      where: { email },
    });
  }
  async findByEmailWithSensitiveData(email: string): Promise<User | null> {
    return this.getRepository()
      .createQueryBuilder('user')
      .addSelect(['user.password', 'user.hashedRt'])
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByPhone(phone: string): Promise<User | null> {
    return await this.getRepository().findOne({
      where: { phone },
    });
  }

  async findByPhoneWithSensitiveData(phone: string): Promise<User | null> {
    return this.getRepository()
      .createQueryBuilder('user')
      .addSelect(['user.password', 'user.hashedRt'])
      .where('user.phone = :phone', { phone })
      .getOne();
  }

  async findOneWithSensitiveData(id: string): Promise<User | null> {
    return this.getRepository()
      .createQueryBuilder('user')
      .addSelect(['user.password', 'user.hashedRt', 'user.twoFactorSecret'])
      .where('user.id = :id', { id })
      .getOne();
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
  async paginateStaff(
    params: PaginateUsersDto,
    actor: ActorUser,
  ): Promise<Pagination<UserResponseDto>> {
    const {
      centerId,
      userProfileId,
      isActive,
      roleId,
      userAccess,
      roleAccess,
      centerAccess,
      displayRole,
      branchId,
      branchAccess,
    } = params;

    const includeCenter =
      centerId &&
      (!centerAccess || centerAccess === AccessibleUsersEnum.INCLUDE);

    const includeBranch =
      branchId &&
      centerId &&
      (!branchAccess || branchAccess === AccessibleUsersEnum.INCLUDE);

    // Create query builder with proper JOINs
    const queryBuilder = this.getRepository()
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userProfiles', 'userProfiles')
      .where('userProfiles.profileType = :profileType', {
        profileType: ProfileType.STAFF,
      });

    if (includeBranch) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM branch_access ba WHERE ba."userProfileId" = userProfiles.id AND ba."branchId" = :branchId AND ba."centerId" = :centerId)',
        { branchId, centerId },
      );
    }

    if (includeCenter) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM center_access ca WHERE ca."userProfileId" = userProfiles.id AND ca."centerId" = :centerId)',
        { centerId },
      );
      if (displayRole) {
        queryBuilder
          .leftJoinAndSelect(
            'userProfiles.profileRoles',
            'profileRoles',
            'profileRoles.userProfileId = userProfiles.id AND profileRoles.centerId = :centerId',
            { centerId },
          )
          .leftJoinAndSelect('profileRoles.role', 'role');
      }
    } else {
      queryBuilder.andWhere(
        'NOT EXISTS (SELECT 1 FROM center_access ca WHERE ca."userProfileId" = userProfiles.id)',
      );
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    const isAdmin = await this.accessControlHelperService.hasAdminRole(
      actor.userProfileId,
    );
    const isUser = await this.accessControlHelperService.hasUserRole(
      actor.userProfileId,
    );

    if (centerId) {
      const isCenterOwner = await this.accessControlHelperService.isCenterOwner(
        actor.userProfileId,
        centerId,
      );

      if (isUser && !isCenterOwner) {
        queryBuilder.andWhere(
          `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = profile.id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" = :centerId)`,
          { userProfileId: actor.userProfileId, centerId },
        );
      }
    } else {
      if (isSuperAdmin) {
        // super admin users have no access control - can see all users
      } else if (isAdmin) {
        queryBuilder.leftJoin('user.centerAccess', 'centerAccess').andWhere(
          `centerAccess.centerId IN (
           SELECT ca."centerId" FROM center_access ca WHERE ca."userProfileId" = :userProfileId
         )`,
          { userProfileId: actor.userProfileId },
        );
      } else if (isUser) {
        throw new BadRequestException('Access denied to this user');
      }
    }

    if (userProfileId) {
      queryBuilder.andWhere('userProfiles.id != :userProfileId', {
        userProfileId,
      });
      if (userAccess === AccessibleUsersEnum.INCLUDE) {
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM "user_access" AS ua
            WHERE ua."targetUserProfileId" = "userProfiles"."id"
            AND ua."granterUserProfileId" = :granterUserProfileId
            ${centerId ? 'AND ua."centerId" = :centerId' : ''}
          )`,
          {
            granterUserProfileId: actor.userProfileId,
            centerId,
          },
        );
      }
    }

    // if (roleId && roleAccess !== AccessibleUsersEnum.ALL) {
    //   queryBuilder
    //     .leftJoinAndSelect('user.userRoles', 'userRoles')
    //     .andWhere('userRoles.roleId = :roleId', {
    //       roleId: roleId,
    //     });
    // }

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

    let filteredItems: UserResponseDto[] =
      result.items as unknown as UserResponseDto[];

    if (userProfileId && userAccess) {
      filteredItems = await this.applyUserAccess(
        filteredItems,
        userProfileId,
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
      );
    }

    if (branchId && branchAccess && centerId) {
      filteredItems = await this.applyBranchAccess(
        filteredItems,
        branchId,
        branchAccess,
        centerId,
      );
    }

    if (displayRole && includeCenter) {
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
    actor: ActorUser,
  ): Promise<Pagination<UserResponseDto>> {
    const {
      centerId,
      roleId,
      userProfileId,
      userAccess,
      isActive,
      roleAccess,
      centerAccess,
    } = params;

    const queryBuilder = this.getRepository()
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userProfiles', 'userProfiles')
      .where('userProfiles.profileType = :profileType', {
        profileType: ProfileType.ADMIN,
      })
      .leftJoinAndSelect('userProfiles.profileRoles', 'profileRoles')
      .leftJoinAndSelect('profileRoles.role', 'role');
    // .andWhere('role.type = :roleType', { roleType: RoleType.ADMIN });

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    const isAdmin = await this.accessControlHelperService.hasAdminRole(
      actor.userProfileId,
    );

    if (!isAdmin) throw new BadRequestException('Access denied to this user');
    if (isSuperAdmin) {
      // do nothing
    } else {
      queryBuilder.andWhere(
        `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = profile.id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" IS NULL)`,
        { userProfileId: actor.userProfileId },
      );
    }

    if (centerId) {
      if (centerAccess !== AccessibleUsersEnum.ALL) {
        queryBuilder.andWhere(
          `EXISTS (
          SELECT 1 FROM center_access ca 
          WHERE ca."userProfileId" = profile.id AND ca."global" = true AND ca."centerId" = :centerId)`,
          { centerId },
        );
      }
      if (!roleId) {
        queryBuilder.orWhere('role.name = :roleName', {
          roleName: DefaultRoles.SUPER_ADMIN,
        });
      }
    }

    if (userProfileId) {
      queryBuilder.andWhere('profile.id != :userProfileId', { userProfileId });
      if (userAccess === AccessibleUsersEnum.INCLUDE) {
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM "user_access" AS ua
            WHERE ua."targetUserProfileId" = "profile"."id"
            AND ua."granterUserProfileId" = :granterUserProfileId
            ${centerId ? 'AND ua."centerId" = :centerId' : ''}
          )`,
          {
            granterUserProfileId: actor.userProfileId,
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

    console.log(results.items);

    let filteredItems: UserResponseDto[] =
      results.items as unknown as UserResponseDto[];
    if (userProfileId && userAccess) {
      filteredItems = await this.applyUserAccess(
        filteredItems,
        userProfileId,
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
    await this.getRepository().update(userId, {
      twoFactorSecret: twoFactorSecret || undefined,
      twoFactorEnabled,
    });
  }

  async updateFailedLoginAttempts(
    userId: string,
    failedAttempts: number,
    lockoutUntil?: Date,
  ): Promise<void> {
    const updateData: Partial<User> = {
      failedLoginAttempts: failedAttempts,
    };
    if (lockoutUntil) {
      updateData.lockoutUntil = lockoutUntil;
    }
    await this.getRepository().update(userId, updateData);
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.getRepository().update(userId, {
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
    });
  }

  async clearAllUsers(): Promise<void> {
    await this.getRepository().createQueryBuilder().delete().execute();
  }

  private prepareUsersResponse(users: UserResponseDto[]): UserResponseDto[] {
    return users.map((user) => {
      const userDto = Object.assign(user, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        role: user?.userProfiles?.[0]?.profileRoles?.[0]
          ?.role as RoleResponseDto,
        userProfile: user.userProfiles[0],
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete (userDto as any).userProfiles;
      return userDto;
    });
  }

  private async applyUserAccess(
    users: UserResponseDto[],
    userId: string,
    userAccess: AccessibleUsersEnum,
    centerId?: string,
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (userAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.accessControlHelperService.getAccessibleProfilesIdsForUser(
          userId,
          userProfileIds,
          centerId,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isProfileAccessible: accessibleProfileIds.includes(
            user.userProfiles[0]?.id,
          ),
        }),
      );
    } else if (userAccess === AccessibleUsersEnum.INCLUDE) {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isProfileAccessible: true,
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
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (roleAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.accessControlHelperService.getAccessibleProfilesIdsForRole(
          roleId,
          userProfileIds,
          centerId,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isRoleAccessible: accessibleProfileIds.includes(
            user.userProfiles[0]?.id,
          ),
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
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (centerAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.accessControlHelperService.getAccessibleProfilesIdsForCenter(
          centerId,
          userProfileIds,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isCenterAccessible: accessibleProfileIds.includes(
            user.userProfiles[0]?.id,
          ),
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

  private async applyBranchAccess(
    users: UserResponseDto[],
    branchId: string,
    branchAccess: AccessibleUsersEnum,
    centerId: string,
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (branchAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.accessControlHelperService.getAccessibleProfilesIdsForBranch(
          branchId,
          userProfileIds,
          centerId,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isBranchAccessible: accessibleProfileIds.includes(
            user.userProfiles[0]?.id,
          ),
        }),
      );
    } else {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isBranchAccessible: true,
        }),
      );
    }
    return filteredItems;
  }
}
