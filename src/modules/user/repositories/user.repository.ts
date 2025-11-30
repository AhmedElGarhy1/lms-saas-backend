import { Injectable } from '@nestjs/common';
import { InsufficientPermissionsException } from '@/shared/common/exceptions/custom.exceptions';
import { User } from '../entities/user.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { USER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { AccessibleUsersEnum } from '../dto/paginate-users.dto';
import { RoleResponseDto } from '@/modules/access-control/dto/role-response.dto';
import { DefaultRoles } from '@/modules/access-control/constants/roles';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { PaginateStaffDto } from '@/modules/staff/dto/paginate-staff.dto';
import { PaginateAdminDto } from '@/modules/admin/dto/paginate-admin.dto';
import * as _ from 'lodash';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof User {
    return User;
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
      .addSelect(['user.password', 'user.hashedRt'])
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
    params: PaginateStaffDto,
    actor: ActorUser,
  ): Promise<Pagination<UserResponseDto>> {
    const {
      centerId,
      userProfileId,
      roleId,
      userAccess,
      roleAccess,
      centerAccess,
      displayDetailes,
      branchId,
      branchAccess,
      isDeleted,
    } = params;
    delete params.isDeleted;

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
      .withDeleted()
      .leftJoinAndSelect('user.userProfiles', 'userProfiles')
      .where('userProfiles.profileType = :profileType', {
        profileType: ProfileType.STAFF,
      });

    this.applyIsActiveFilter(
      queryBuilder,
      params,
      centerId && displayDetailes
        ? 'centerAccess.isActive'
        : 'userProfiles.isActive',
    );

    if (includeBranch) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM branch_access ba WHERE ba."userProfileId" = userProfiles.id AND ba."branchId" = :branchId AND ba."centerId" = :centerId AND ba."deletedAt" IS NULL)',
        { branchId, centerId },
      );
    }

    if (includeCenter) {
      queryBuilder
        .andWhere(
          `EXISTS
          (SELECT 1 FROM center_access ca WHERE ca."userProfileId" = userProfiles.id AND ca."centerId" = :centerId
           ${isDeleted ? 'AND ca."deletedAt" IS NOT NULL' : 'AND ca."deletedAt" IS NULL'})`,
          { centerId },
        )
        .andWhere('userProfiles.deletedAt IS NULL'); // always include non deleted users in center

      if (displayDetailes) {
        queryBuilder
          .leftJoinAndSelect(
            'userProfiles.profileRoles',
            'profileRoles',
            'profileRoles.userProfileId = userProfiles.id AND profileRoles.centerId = :centerId',
            { centerId },
          )
          .leftJoinAndSelect('profileRoles.role', 'role');

        queryBuilder
          .withDeleted()
          .andWhere('user.deletedAt IS NULL')
          .leftJoinAndSelect(
            'userProfiles.centerAccess',
            'centerAccess',
            `
            "centerAccess"."centerId" = :centerId
            AND "centerAccess"."userProfileId" = "userProfiles"."id"           
            `,
            { centerId },
          );
      }
      if (roleId && roleAccess !== AccessibleUsersEnum.ALL) {
        if (displayDetailes) {
          queryBuilder.andWhere('role.id = :roleId', { roleId });
        } else {
          // queryBuilder
          //   .leftJoin('userProfiles.profileRoles', 'profileRoles')
          //   .andWhere('profileRoles.roleId = :roleId', { roleId });

          queryBuilder.andWhere(
            `EXISTS (SELECT 1 FROM profile_roles pr WHERE pr."userProfileId" = "userProfiles".id AND pr."roleId" = :roleId AND pr."deletedAt" IS NULL)`,
            { roleId },
          );
        }
      }
    } else {
      if (isDeleted) {
        queryBuilder.andWhere('userProfiles.deletedAt IS NOT NULL');
      }
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    const isAdmin = await this.accessControlHelperService.isAdmin(
      actor.userProfileId,
    );

    if (centerId) {
      const isCenterOwner = await this.accessControlHelperService.isCenterOwner(
        actor.userProfileId,
        centerId,
      );
      const isUser = await this.accessControlHelperService.isStaff(
        actor.userProfileId,
      );

      if (isUser && !isCenterOwner) {
        queryBuilder.andWhere(
          `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = "userProfiles".id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" = :centerId AND ua."deletedAt" IS NULL)`,
          { userProfileId: actor.userProfileId, centerId },
        );
      }
    } else {
      if (isSuperAdmin) {
        // super admin users have no access control - can see all users
      } else if (isAdmin) {
        queryBuilder
          .andWhere(
            `EXISTS (SELECT 1 FROM center_access ca WHERE ca."userProfileId" = "userProfiles".id AND ca."centerId" = :centerId AND ca."deletedAt" IS NULL)`,
            { centerId },
          )
          .orWhere(
            `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = "userProfiles".id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" = :centerId AND ua."deletedAt" IS NULL)`,
            { userProfileId: actor.userProfileId, centerId },
          );
      } else {
        throw new InsufficientPermissionsException(
          't.errors.notAuthorized.action',
          {
            action: 't.common.buttons.view',
            resource: 't.common.labels.user',
          },
        );
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
            AND ua."deletedAt" IS NULL
            ${centerId ? 'AND ua."centerId" = :centerId' : ''}
          )`,
          {
            granterUserProfileId: userProfileId,
            centerId,
          },
        );
      }
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

    filteredItems = this.prepareUsersResponse(filteredItems);

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
    params: PaginateAdminDto,
    actor: ActorUser,
  ): Promise<Pagination<UserResponseDto>> {
    const {
      centerId,
      roleId,
      userProfileId,
      userAccess,
      roleAccess,
      centerAccess,
      isDeleted,
    } = params;
    delete params.isDeleted;

    const queryBuilder = this.getRepository()
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoinAndSelect('user.userProfiles', 'userProfiles')
      .where('userProfiles.profileType = :profileType', {
        profileType: ProfileType.ADMIN,
      })
      .leftJoinAndSelect('userProfiles.profileRoles', 'profileRoles')
      .leftJoinAndSelect('profileRoles.role', 'role')
      .andWhere(
        '("user"."deletedAt" IS NULL AND "profileRoles"."deletedAt" IS NULL AND "role"."deletedAt" IS NULL)',
      );

    if (isDeleted) {
      queryBuilder.andWhere('userProfiles.deletedAt IS NOT NULL');
    } else {
      queryBuilder.andWhere('userProfiles.deletedAt IS NULL');
    }

    this.applyIsActiveFilter(queryBuilder, params, 'userProfiles.isActive');

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    const isAdmin = await this.accessControlHelperService.isAdmin(
      actor.userProfileId,
    );

    if (!isAdmin)
      throw new InsufficientPermissionsException(
        't.errors.notAuthorized.action',
        {
          action: 't.common.buttons.view',
          resource: 't.common.labels.user',
        },
      );
    if (isSuperAdmin) {
      // do nothing
    } else {
      queryBuilder.andWhere(
        `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = "userProfiles".id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" IS NULL AND ua."deletedAt" IS NULL)`,
        { userProfileId: actor.userProfileId },
      );
    }

    if (centerId) {
      if (centerAccess !== AccessibleUsersEnum.ALL) {
        queryBuilder.andWhere(
          `EXISTS (
          SELECT 1 FROM center_access ca 
          WHERE ca."userProfileId" = "userProfiles".id AND ca."centerId" = :centerId AND ca."deletedAt" IS NULL)`,
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
      queryBuilder.andWhere('"userProfiles".id != :userProfileId', {
        userProfileId,
      });
      if (userAccess === AccessibleUsersEnum.INCLUDE) {
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM "user_access" AS ua
            WHERE ua."targetUserProfileId" = "userProfiles"."id"
            AND ua."granterUserProfileId" = :granterUserProfileId
            AND ua."deletedAt" IS NULL
            ${centerId ? 'AND ua."centerId" = :centerId' : ''}
          )`,
          {
            granterUserProfileId: userProfileId,
            centerId,
          },
        );
      }
    }

    if (roleId && roleAccess !== AccessibleUsersEnum.ALL) {
      queryBuilder.andWhere('role.id = :roleId', { roleId });
    }

    const results = await this.paginate(
      params,
      USER_PAGINATION_COLUMNS,
      '/users/admin',
      queryBuilder,
    );

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
    twoFactorEnabled: boolean,
  ): Promise<void> {
    await this.getRepository().update(userId, {
      twoFactorEnabled,
    });
  }

  async clearAllUsers(): Promise<void> {
    await this.getRepository().createQueryBuilder().delete().execute();
  }

  private prepareUsersResponse(users: UserResponseDto[]): UserResponseDto[] {
    return users.map((user) => {
      const role = user.userProfiles?.[0]?.profileRoles?.[0]
        ?.role as RoleResponseDto;
      let userProfile = user.userProfiles?.[0];
      // @ts-expect-error - TypeORM relation typing issue
      userProfile.centerAccess = userProfile?.centerAccess?.[0];

      user = _.omit(user, ['userProfiles']) as UserResponseDto;
      userProfile = _.omit(userProfile, ['profileRoles']) as UserProfile;

      const userResponse = {
        ...user,
        role,
        userProfile,
      } as UserResponseDto;

      return userResponse;
    });
  }

  private async applyUserAccess(
    users: UserResponseDto[],
    userProfileId: string,
    userAccess: AccessibleUsersEnum,
    centerId?: string,
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (userAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.accessControlHelperService.getAccessibleProfilesIdsForUser(
          userProfileId,
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
    } else {
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
