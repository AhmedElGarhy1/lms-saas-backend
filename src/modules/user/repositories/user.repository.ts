import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from '@/shared/common/types/pagination.types';
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
import { PaginateStudentDto } from '@/modules/students/dto/paginate-student.dto';
import { PaginateTeacherDto } from '@/modules/teachers/dto/paginate-teacher.dto';
import { PaginateAdminDto } from '@/modules/admin/dto/paginate-admin.dto';
import * as _ from 'lodash';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { GroupStudentsRepository } from '@/modules/classes/repositories/group-students.repository';
import { In, IsNull } from 'typeorm';
import { AccessControlErrors } from '@/modules/access-control/exceptions/access-control.errors';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly classAccessService: ClassAccessService,
    private readonly groupStudentsRepository: GroupStudentsRepository,
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
      displayDetails,
      branchId,
      branchAccess,
      classId,
      classAccess,
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

    const includeRoleAccess =
      roleId && (!roleAccess || roleAccess === AccessibleUsersEnum.INCLUDE);

    const includeClass =
      classId && (!classAccess || classAccess === AccessibleUsersEnum.INCLUDE);

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
      centerId ? 'centerAccess.isActive' : 'userProfiles.isActive',
    );

    if (includeBranch) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM branch_access ba WHERE ba."userProfileId" = userProfiles.id AND ba."branchId" = :branchId AND ba."centerId" = :centerId)',
        { branchId, centerId },
      );
    }

    if (includeClass) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM class_staff cs WHERE cs."userProfileId" = userProfiles.id AND cs."classId" = :classId AND cs."leftAt" IS NULL)',
        { classId },
      );
    }

    if (includeCenter) {
      queryBuilder
        .leftJoinAndSelect(
          'userProfiles.centerAccess',
          'centerAccess',
          `centerAccess.centerId = :centerId AND centerAccess.userProfileId = userProfiles.id`,
          { centerId },
        )
        .andWhere(
          `centerAccess.deletedAt IS ${isDeleted ? 'NOT NULL' : 'NULL'}`,
        )
        .andWhere('centerAccess.centerId = :centerId', { centerId });
    }

    if (centerId) {
      const canBypassCenterAccess =
        await this.accessControlHelperService.bypassCenterInternalAccess(
          actor.userProfileId,
          centerId,
        );

      if (!canBypassCenterAccess) {
        queryBuilder.andWhere(
          `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = "userProfiles".id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" = :centerId)`,
          { userProfileId: actor.userProfileId, centerId },
        );
      }

      if (displayDetails) {
        queryBuilder
          .leftJoinAndSelect(
            'userProfiles.profileRoles',
            'profileRoles',
            'profileRoles.userProfileId = userProfiles.id AND profileRoles.centerId = :centerId',
            { centerId },
          )
          .leftJoinAndSelect('profileRoles.role', 'role');
      }

      if (includeRoleAccess) {
        if (displayDetails) {
          queryBuilder.andWhere('role.id = :roleId', { roleId });
        } else {
          queryBuilder.andWhere(
            `EXISTS (SELECT 1 FROM profile_roles pr WHERE pr."userProfileId" = "userProfiles".id AND pr."roleId" = :roleId AND pr."deletedAt" IS NULL)`,
            { roleId },
          );
        }
      }
    } else {
      const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
        actor.userProfileId,
      );

      if (isSuperAdmin) {
        // super admin users have no access control - can see all users
      } else if (actor.profileType === ProfileType.ADMIN) {
        queryBuilder.andWhere(
          `EXISTS (SELECT 1 FROM center_access ca WHERE ca."userProfileId" = "userProfiles".id AND ca."centerId" = :centerId AND ca."deletedAt" IS NULL)`,
          { centerId },
        );
      } else {
        throw AccessControlErrors.cannotAccessUserRecords();
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
        ProfileType.STAFF,
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
    if (classId && classAccess) {
      filteredItems = await this.applyClassAccessForStaff(
        filteredItems,
        classId,
        classAccess,
      );
    }

    filteredItems = this.prepareUsersResponse(filteredItems);

    return {
      ...result,
      items: filteredItems,
    };
  }

  /**
   * Paginate students in a specific center using JOINs for better performance
   * @param query - Pagination query
   * @param centerId - Center ID to filter users
   * @param userId - User ID to filter users
   * @param options - Options for pagination
   * @param options.isActive - Whether to filter active users
   * @param options.targetUserId - User ID to filter users
   * @returns Paginated users in the specified center
   */
  async paginateStudents(
    params: PaginateStudentDto,
    actor: ActorUser,
  ): Promise<Pagination<UserResponseDto>> {
    const {
      centerId,
      centerAccess,
      displayDetails,
      isDeleted,
      groupId,
      groupAccess,
      classId,
      classAccess,
    } = params;
    delete params.isDeleted;

    const includeCenter =
      centerId &&
      (!centerAccess || centerAccess === AccessibleUsersEnum.INCLUDE);

    const includeGroup =
      groupId && (!groupAccess || groupAccess === AccessibleUsersEnum.INCLUDE);

    const includeClass =
      classId && (!classAccess || classAccess === AccessibleUsersEnum.INCLUDE);

    // Create query builder with proper JOINs
    const queryBuilder = this.getRepository()
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoinAndSelect('user.userProfiles', 'userProfiles')
      .where('userProfiles.profileType = :profileType', {
        profileType: ProfileType.STUDENT,
      });
    this.applyIsActiveFilter(
      queryBuilder,
      params,
      centerId ? 'centerAccess.isActive' : 'userProfiles.isActive',
    );

    if (includeGroup) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM group_students gs WHERE gs."studentUserProfileId" = userProfiles.id AND gs."groupId" = :groupId AND gs."leftAt" IS NULL)',
        { groupId },
      );
    }

    if (includeClass) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM group_students gs WHERE gs."studentUserProfileId" = userProfiles.id AND gs."classId" = :classId AND gs."leftAt" IS NULL)',
        { classId },
      );
    }

    if (includeCenter) {
      queryBuilder
        .leftJoinAndSelect(
          'userProfiles.centerAccess',
          'centerAccess',
          `centerAccess.centerId = :centerId AND centerAccess.userProfileId = userProfiles.id`,
          { centerId },
        )
        .andWhere(
          `centerAccess.deletedAt IS ${isDeleted ? 'NOT NULL' : 'NULL'}`,
        )
        .andWhere('centerAccess.centerId = :centerId', { centerId });
    }

    const result = await this.paginate(
      params,
      USER_PAGINATION_COLUMNS,
      '/users',
      queryBuilder,
    );

    let filteredItems: UserResponseDto[] =
      result.items as unknown as UserResponseDto[];

    if (centerId && centerAccess) {
      filteredItems = await this.applyCenterAccess(
        filteredItems,
        centerId,
        centerAccess,
      );
    }
    if (groupId && groupAccess) {
      filteredItems = await this.applyGroupAccess(
        filteredItems,
        groupId,
        groupAccess,
      );
    }
    if (classId && classAccess) {
      filteredItems = await this.applyClassAccess(
        filteredItems,
        classId,
        classAccess,
      );
    }

    filteredItems = this.prepareUsersResponse(filteredItems);

    return {
      ...result,
      items: filteredItems,
    };
  }

  // Access controls are applied at the service layer
  /**
   * Paginate teachers in a specific center using JOINs for better performance
   * @param query - Pagination query
   * @param centerId - Center ID to filter users
   * @param userId - User ID to filter users
   * @param options - Options for pagination
   * @param options.isActive - Whether to filter active users
   * @param options.targetUserId - User ID to filter users
   * @returns Paginated users in the specified center
   */
  async paginateTeachers(
    params: PaginateTeacherDto,
    actor: ActorUser,
  ): Promise<Pagination<UserResponseDto>> {
    const {
      centerId,
      centerAccess,
      displayDetails,
      isDeleted,
      staffProfileId,
      staffProfileAccess,
    } = params;
    delete params.isDeleted;

    const includeCenter =
      centerId &&
      (!centerAccess || centerAccess === AccessibleUsersEnum.INCLUDE);

    const includeStaffProfile =
      staffProfileId &&
      (!staffProfileAccess ||
        staffProfileAccess === AccessibleUsersEnum.INCLUDE);

    // Create query builder with proper JOINs
    const queryBuilder = this.getRepository()
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoinAndSelect('user.userProfiles', 'userProfiles')
      .where('userProfiles.profileType = :profileType', {
        profileType: ProfileType.TEACHER,
      });

    this.applyIsActiveFilter(
      queryBuilder,
      params,
      centerId ? 'centerAccess.isActive' : 'userProfiles.isActive',
    );

    if (includeCenter) {
      queryBuilder
        .leftJoinAndSelect(
          'userProfiles.centerAccess',
          'centerAccess',
          `centerAccess.centerId = :centerId AND centerAccess.userProfileId = userProfiles.id`,
          { centerId },
        )
        .andWhere(
          `centerAccess.deletedAt IS ${isDeleted ? 'NOT NULL' : 'NULL'}`,
        )
        .andWhere('centerAccess.centerId = :centerId', { centerId });
    }

    if (includeStaffProfile) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = userProfiles.id AND ua."granterUserProfileId" = :staffProfileId)',
        { staffProfileId },
      );
    }

    if (centerId) {
      const canBypassCenterAccess =
        await this.accessControlHelperService.bypassCenterInternalAccess(
          actor.userProfileId,
          centerId,
        );

      if (!canBypassCenterAccess) {
        queryBuilder.andWhere(
          `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = "userProfiles".id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" = :centerId)`,
          { userProfileId: actor.userProfileId, centerId },
        );
      }
    } else {
      const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
        actor.userProfileId,
      );

      if (isSuperAdmin) {
        // super admin users have no access control - can see all users
      } else if (actor.profileType === ProfileType.ADMIN) {
        queryBuilder.andWhere(
          `EXISTS (SELECT 1 FROM center_access ca WHERE ca."userProfileId" = "userProfiles".id AND ca."centerId" = :centerId AND ca."deletedAt" IS NULL)`,
          { centerId },
        );
      } else {
        throw AccessControlErrors.cannotAccessUserRecords();
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

    if (centerId && centerAccess) {
      filteredItems = await this.applyCenterAccess(
        filteredItems,
        centerId,
        centerAccess,
      );
    }

    if (staffProfileId && staffProfileAccess) {
      filteredItems = await this.applyStaffProfileAccess(
        filteredItems,
        staffProfileId,
        staffProfileAccess,
        centerId,
        ProfileType.TEACHER,
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

    if (actor.profileType !== ProfileType.ADMIN)
      throw AccessControlErrors.cannotAccessUserRecords();
    if (isSuperAdmin) {
      // do nothing
    } else {
      queryBuilder.andWhere(
        `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = "userProfiles".id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" IS NULL)`,
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
        ProfileType.ADMIN,
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

  /**
   * Find a single staff user by profile ID with the same structure as paginateStaff
   * @param userProfileId - User profile ID
   * @param actor - Actor user for access control
   * @param includeDeleted - Whether to include soft-deleted users
   * @returns UserResponseDto or null if not found
   */
  async findStaffUserByProfileId(
    userProfileId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<UserResponseDto | null> {
    return await this.generateFindOneQueryBuilder(userProfileId, actor, includeDeleted, ProfileType.STAFF);
  }

  /**
   * Find a single student user by profile ID with the same structure as paginateStudents
   * @param userProfileId - User profile ID
   * @param actor - Actor user for access control
   * @param includeDeleted - Whether to include soft-deleted users
   * @returns UserResponseDto or null if not found
   */
  async findStudentUserByProfileId(
    userProfileId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<UserResponseDto | null> {
    return this.generateFindOneQueryBuilder(userProfileId, actor, includeDeleted, ProfileType.STUDENT);
  }

  /**
   * Find a single teacher user by profile ID with the same structure as paginateTeachers
   * @param userProfileId - User profile ID
   * @param actor - Actor user for access control
   * @param includeDeleted - Whether to include soft-deleted users
   * @returns UserResponseDto or null if not found
   */
  async findTeacherUserByProfileId(
    userProfileId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<UserResponseDto | null> {
   return this.generateFindOneQueryBuilder(userProfileId, actor, includeDeleted, ProfileType.TEACHER);
  }

  /**
   * Find a single admin user by profile ID with the same structure as paginateAdmins
   * @param userProfileId - User profile ID
   * @param actor - Actor user for access control
   * @param includeDeleted - Whether to include soft-deleted users
   * @returns UserResponseDto or null if not found
   */
  async findAdminUserByProfileId(
    userProfileId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<UserResponseDto | null> {
    return this.generateFindOneQueryBuilder(userProfileId, actor, includeDeleted, ProfileType.ADMIN);
  }

  async generateFindOneQueryBuilder(
    userProfileId: string,
    actor: ActorUser,
    includeDeleted = false,
    profileType: ProfileType,
  ): Promise<UserResponseDto | null> {
    const centerId = actor.centerId;

    // Build query builder similar to paginateStaff
    const queryBuilder = this.getRepository()
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoinAndSelect('user.userProfiles', 'userProfiles')
      .where('userProfiles.profileType = :profileType', {
        profileType: profileType,
      })
      .andWhere('userProfiles.id = :targetUserProfileId', {
        targetUserProfileId: userProfileId,
      });

    if (!includeDeleted) {
      queryBuilder.andWhere('userProfiles.deletedAt IS NULL');
    }

    // Add center access if centerId is provided
    if (centerId && profileType !== ProfileType.ADMIN) {
      if (profileType === ProfileType.STAFF) {
        queryBuilder.leftJoinAndSelect(
          'userProfiles.profileRoles',
          'profileRoles',
          'profileRoles.centerId = :centerId',
          { centerId },
        )
        .leftJoinAndSelect('profileRoles.role', 'role')
      }
      queryBuilder
        .leftJoinAndSelect(
          'userProfiles.centerAccess',
          'centerAccess',
          
        ).andWhere('centerAccess.centerId = :centerId', { centerId });

        if (!includeDeleted) {
          queryBuilder.andWhere('centerAccess.deletedAt IS NULL');
        }
    }
    if (profileType === ProfileType.ADMIN) {
      queryBuilder.leftJoinAndSelect('userProfiles.profileRoles', 'profileRoles', 'profileRoles.centerId IS NULL')
      .leftJoinAndSelect('profileRoles.role', 'role');
    }

 if (profileType !== ProfileType.ADMIN) {
  const canBypassCenterAccess = await this.accessControlHelperService.bypassCenterInternalAccess(
    actor.userProfileId,
    centerId,
   );

   if (!canBypassCenterAccess) {
    queryBuilder.andWhere(
      `EXISTS (SELECT 1 FROM user_access ua WHERE ua."targetUserProfileId" = "userProfiles".id AND ua."granterUserProfileId" = :userProfileId AND ua."centerId" = :centerId)`,
      { userProfileId: actor.userProfileId, centerId },
    );
   }
  }
    const user = await queryBuilder.getOne();

    if (!user) {
      return null;
    }

    // Format response using prepareUsersResponse
    const formatted = this.prepareUsersResponse([
      user as unknown as UserResponseDto,
    ]);

    return formatted[0] || null;
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
    profileType?: ProfileType,
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (userAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.accessControlHelperService.getAccessibleProfilesIdsForUser(
          userProfileId,
          userProfileIds,
          centerId,
          profileType,
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

  private async applyGroupAccess(
    users: UserResponseDto[],
    groupId: string,
    groupAccess: AccessibleUsersEnum,
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (groupAccess === AccessibleUsersEnum.ALL) {
      const groupStudents = await this.groupStudentsRepository.findMany({
        where: {
          groupId,
          studentUserProfileId: In(userProfileIds),
          leftAt: IsNull(),
        },
      });
      const accessibleProfileIds = groupStudents.map(
        (gs) => gs.studentUserProfileId,
      );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isGroupAccessible: accessibleProfileIds.includes(
            user.userProfiles[0]?.id,
          ),
        }),
      );
    } else {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isGroupAccessible: true,
        }),
      );
    }
    return filteredItems;
  }

  private async applyClassAccess(
    users: UserResponseDto[],
    classId: string,
    classAccess: AccessibleUsersEnum,
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (classAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.classAccessService.getAccessibleStudentProfileIdsForClass(
          classId,
          userProfileIds,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isClassAccessible: accessibleProfileIds.includes(
            user.userProfiles[0]?.id,
          ),
        }),
      );
    } else {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isClassAccessible: true,
        }),
      );
    }
    return filteredItems;
  }

  private async applyClassAccessForStaff(
    users: UserResponseDto[],
    classId: string,
    classAccess: AccessibleUsersEnum,
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (classAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.classAccessService.getAccessibleStaffProfileIdsForClass(
          classId,
          userProfileIds,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isClassAccessible: accessibleProfileIds.includes(
            user.userProfiles[0]?.id,
          ),
        }),
      );
    } else {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isClassAccessible: true,
        }),
      );
    }
    return filteredItems;
  }

  private async applyStaffProfileAccess(
    users: UserResponseDto[],
    staffProfileId: string,
    staffProfileAccess: AccessibleUsersEnum,
    centerId: string | undefined,
    profileType: ProfileType,
  ): Promise<UserResponseDto[]> {
    const userProfileIds = users.map((user) => user.userProfiles[0]?.id);
    let filteredItems: UserResponseDto[] = users;
    if (staffProfileAccess === AccessibleUsersEnum.ALL) {
      const accessibleProfileIds =
        await this.accessControlHelperService.getAccessibleProfilesIdsForUser(
          staffProfileId,
          userProfileIds,
          centerId,
          profileType,
        );
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isStaffProfileAccessible: accessibleProfileIds.includes(
            user.userProfiles[0]?.id,
          ),
        }),
      );
    } else {
      filteredItems = filteredItems.map((user) =>
        Object.assign(user, {
          isStaffProfileAccessible: true,
        }),
      );
    }
    return filteredItems;
  }

  async countStudentsForCenter(centerId: string): Promise<number> {
    // Count students enrolled in groups that belong to classes in this center
    const result = await this.getRepository()
      .createQueryBuilder('user')
      .leftJoin('user.userProfiles', 'userProfile', 'userProfile.profileType = :type', { type: ProfileType.STUDENT })
      .leftJoin("userProfile.centerAccess", "centerAccess")
      .where("centerAccess.centerId = :centerId", { centerId })
      .select('COUNT(DISTINCT user.id)', 'count')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async countTeachersForCenter(centerId: string): Promise<number> {
    // Count teachers assigned to classes in this center
    const result = await this.getRepository()
      .createQueryBuilder('user')
      .leftJoin('user.userProfiles', 'userProfile', 'userProfile.profileType = :type', { type: ProfileType.TEACHER })
      .leftJoin("userProfile.centerAccess", "centerAccess")
      .where('centerAccess.centerId = :centerId', { centerId })
      .select('COUNT(DISTINCT user.id)', 'count')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async countStaffForCenter(centerId: string): Promise<number> {
    // Count staff assigned to classes in this center
    const result = await this.getRepository()
      .createQueryBuilder('user')
      .leftJoin('user.userProfiles', 'userProfile', 'userProfile.profileType = :type', { type: ProfileType.STAFF })
      .leftJoin("userProfile.centerAccess", "centerAccess")
      .where('centerAccess.centerId = :centerId', { centerId })
      .select('COUNT(DISTINCT user.id)', 'count')
      .getRawOne();

    return parseInt(result.count) || 0;
  }
}
