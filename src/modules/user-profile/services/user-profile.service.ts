import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { UserProfile } from '../entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { BaseService } from '@/shared/common/services/base.service';
import { UserProfileErrors } from '../exceptions/user-profile.errors';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { CreateUserProfileDto } from '../dto/create-user-profile.dto';
import { UserService } from '@/modules/user/services/user.service';
import { FileService } from '@/modules/file/services/file.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { UserProfilePermissionService } from '@/modules/access-control/services/user-profile-permission.service';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { CentersService } from '@/modules/centers/services/centers.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { StudentEvents } from '@/shared/events/student.events.enum';
import { TeacherEvents } from '@/shared/events/teacher.events.enum';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { CreateStaffEvent } from '@/modules/staff/events/staff.events';
import { CreateStudentEvent } from '@/modules/students/events/student.events';
import { CreateTeacherEvent } from '@/modules/teachers/events/teacher.events';
import { CreateAdminEvent } from '@/modules/admin/events/admin.events';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { UserProfileCodeService } from './user-profile-code.service';
import { CentersErrors } from '@/modules/centers/exceptions/centers.errors';
import { SelfProtectionService } from '@/shared/common/services/self-protection.service';
import { RoleHierarchyService } from '@/shared/common/services/role-hierarchy.service';

@Injectable()
export class UserProfileService extends BaseService {
  private readonly logger: Logger = new Logger(UserProfileService.name);

  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly fileService: FileService,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly centerService: CentersService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly userProfilePermissionService: UserProfilePermissionService,
    private readonly userProfileCodeService: UserProfileCodeService,
    private readonly selfProtectionService: SelfProtectionService,
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {
    super();
  }

  async listProfiles(actorUser: ActorUser): Promise<UserProfile[]> {
    return this.userProfileRepository.findMany({
      where: { userId: actorUser.id },
    });
  }

  async getCurrentUserProfile(
    actor: ActorUser,
    centerId: string,
  ): Promise<ProfileResponseDto> {
    // Get user with profile
    const user = await this.userService.findOne(actor.id);
    if (!user) {
      throw UserProfileErrors.userProfileNotFound();
    }

    // Populate avatar URL
    await this.fileService.attachUrls(
      [user], // Array with single user
      'avatarFileId', // Field containing file ID
      'avatarUrl', // Field to add URL to
      true, // Avatars are public
    );

    // Determine context based on centerId
    const returnData: ProfileResponseDto = {
      ...user,
      profileType: actor.profileType,
      profile: null,
    };

    if (!actor.userProfileId) return returnData;
    const userProfile = await this.findOne(actor.userProfileId);
    if (!userProfile) {
      throw UserProfileErrors.userProfileNotFound();
    }
    actor.userProfileId = userProfile.id;
    actor.profileType = userProfile.profileType;

    if (centerId) {
      await this.accessControlHelperService.validateCenterAccess({
        userProfileId: actor.userProfileId,
        centerId,
      });
      if (
        actor.profileType === ProfileType.STAFF ||
        actor.profileType === ProfileType.ADMIN
      ) {
        const profileRole =
          await this.accessControlHelperService.getProfileRole(
            actor.userProfileId,
            centerId,
          );
        returnData.role = profileRole?.role?.name ?? null;
      }
      returnData.center = await this.centerService.findCenterById(centerId);
    }
    if (!returnData.role) {
      const profileRole = await this.accessControlHelperService.getProfileRole(
        actor.userProfileId,
      );
      returnData.role = profileRole?.role?.name ?? null;
    }

    const profile = await this.userProfileRepository.getTargetProfile(
      actor.userProfileId,
      actor.profileType,
    );
    if (!profile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    returnData.profile = profile;
    returnData.profileType = actor.profileType;

    return returnData;
  }

  async activateProfileUser(
    userProfileId: string,
    isActive: boolean,
    actor: ActorUser,
  ) {
    // Self-protection check - applies to ALL operations (activate AND deactivate)
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      userProfileId,
    );

    // Role hierarchy check (centerId is optional - owner check only happens if provided)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      userProfileId,
      actor.centerId, // Optional - use actor's centerId if available, undefined for global operations
    );

    // Get userProfile to determine profileType
    const userProfile = await this.findOne(userProfileId);
    if (!userProfile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    // Check permission based on profileType
    await this.userProfilePermissionService.canActivate(actor, userProfileId);

    await this.userProfileRepository.update(userProfileId, { isActive });

    return userProfile;
  }

  /**
   * Updates a user profile's basic information
   * @param userProfileId The profile ID to update
   * @param dto Update data
   * @param actor The user performing the action
   * @returns The updated User entity
   */
  async updateProfile(
    userProfileId: string,
    dto: UpdateUserProfileDto,
    actor: ActorUser,
  ) {
    // Role hierarchy check (centerId is optional - owner check only happens if provided)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      userProfileId,
      actor.centerId, // Optional - use actor's centerId if available, undefined for global operations
    );

    // Get the user profile to find the profileType
    const userProfile = await this.findOne(userProfileId);
    if (!userProfile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    // Validate user profile is active
    if (!userProfile.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    // Check permission based on profileType
    await this.userProfilePermissionService.canUpdate(actor, userProfileId);

    // 4. Convert profile update data to user update format
    const userUpdateData: UpdateUserDto = {
      name: dto.name,
      phone: dto.phone,
      isActive: dto.isActive,
      userInfo: {
        address: dto.userInfo?.address,
        dateOfBirth: dto.userInfo?.dateOfBirth
          ? new Date(dto.userInfo.dateOfBirth)
          : undefined,
        locale: dto.userInfo?.locale,
      },
    };

    // 5. Update User entity (this will emit UserUpdatedEvent)
    return await this.userService.updateUser(
      userProfile.userId,
      userUpdateData,
      actor,
    );
  }

  async findForUser(userId: string, userProfileId: string) {
    return this.userProfileRepository.findForUser(userId, userProfileId);
  }

  /**
   * Optimized lookup by userProfileId or studentCode
   * Returns minimal data for performance
   */
  async lookupProfile(
    identifier: string,
  ): Promise<{ userProfileId: string; code: string }> {
    const result =
      await this.userProfileRepository.findProfileLookupData(identifier);

    if (!result) {
      throw UserProfileErrors.userProfileNotFound();
    }

    return result;
  }

  async findOne(
    userProfileId: string,
    actor?: ActorUser,
    includeDeleted = false,
  ) {
    const profile =
      await this.userProfileRepository.findUserProfileWithRelations(
        userProfileId,
        includeDeleted,
      );

    if (!profile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    // If actor is provided, validate user access (centerId is optional)
    if (actor) {
      await this.accessControlHelperService.validateUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: userProfileId,
        centerId: actor.centerId, // Optional - can be undefined
      });
    }

    return profile;
  }

  async createUserProfile(
    userId: string,
    profileType: ProfileType,
    profileRefId: string,
    isActive: boolean = true,
  ): Promise<UserProfile> {
    // Check if user already has this profile type
    const existingProfile = await this.findUserProfileByType(
      userId,
      profileType,
    );
    if (existingProfile) {
      throw UserProfileErrors.userProfileInvalidData();
    }

    const code = await this.userProfileCodeService.generate(profileType);
    const userProfile = await this.userProfileRepository.create({
      userId,
      profileType,
      profileRefId,
      code,
      isActive,
    });

    return userProfile;
  }

  async findUserProfilesByUserId(userId: string): Promise<UserProfile[]> {
    return this.userProfileRepository.findMany({
      where: { userId },
    });
  }

  async findUserProfileByType(
    userId: string,
    profileType: ProfileType,
  ): Promise<UserProfile | null> {
    return this.userProfileRepository.findUserProfileByType(
      userId,
      profileType,
    );
  }

  async deleteUserProfile(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    // Self-protection check - applies to ALL operations
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      userProfileId,
    );

    // Role hierarchy check (centerId is optional - owner check only happens if provided)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      userProfileId,
      actor.centerId, // Optional - use actor's centerId if available, undefined for global operations
    );

    // Get userProfile to determine profileType
    const userProfile = await this.findOne(userProfileId);
    if (!userProfile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    // Check permission based on profileType
    await this.userProfilePermissionService.canDelete(actor, userProfileId);

    await this.userProfileRepository.softRemove(userProfileId);
  }

  async restoreUserProfile(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    // Self-protection check - applies to ALL operations
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      userProfileId,
    );

    // Role hierarchy check (centerId is optional - owner check only happens if provided)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      userProfileId,
      actor.centerId, // Optional - use actor's centerId if available, undefined for global operations
    );

    // First, fetch the soft-deleted profile to get its profileType
    const deletedProfile =
      await this.userProfileRepository.findOneSoftDeletedById(userProfileId);

    if (!deletedProfile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    if (!deletedProfile.deletedAt) {
      throw UserProfileErrors.userProfileInvalidData();
    }

    // Check permission based on profileType
    await this.userProfilePermissionService.canRestore(actor, userProfileId);

    await this.userProfileRepository.restore(userProfileId);
  }

  async isAdmin(userProfileId: string) {
    return !!(await this.userProfileRepository.isAdmin(userProfileId));
  }

  async isStaff(userProfileId: string) {
    return !!(await this.userProfileRepository.isStaff(userProfileId));
  }

  /**
   * Creates a new user profile with all associated entities and access control
   * @param dto Profile creation data
   * @param actor The user performing the action
   * @param existingProfileRefId Optional: Use existing profileRefId instead of creating new entity
   * @returns The created UserProfile
   */
  async createProfile(
    dto: CreateUserProfileDto,
    actor: ActorUser,
  ): Promise<UserProfile> {
    // 1. Validate that actor has permission to create this profile type
    await this.userProfilePermissionService.canCreate(actor, dto.profileType);

    // Validate center is active if centerId is provided
    const centerId = actor.centerId ?? dto.centerId;
    if (centerId) {
      const center = await this.centerService.findCenterById(centerId, actor);
      if (!center.isActive) {
        throw CentersErrors.centerInactive();
      }
    }

    const { isActive, ...userData } = dto;

    let isCenterAccessActive = true;
    let isUserProfileActive = true;
    if (dto.centerId) {
      if (isActive !== undefined) {
        isCenterAccessActive = isActive;
      }
    } else {
      if (isActive !== undefined) {
        isUserProfileActive = isActive;
      }
    }

    // 2. Create User entity (includes UserInfo creation)
    const createdUser = await this.userService.createUser(userData);

    // 3. Get or create profileRefEntity (Staff/Admin/Teacher) based on profileType
    // Use existing profileRefId if provided, otherwise create new one
    const profileRefId =
      await this.userProfileRepository.createProfileRefEntity(dto.profileType);

    // 4. Create UserProfile linking User to profileRefEntity
    const userProfile = await this.createUserProfile(
      createdUser.id,
      dto.profileType,
      profileRefId,
      isUserProfileActive,
    );

    // 5. Emit domain events for STAFF, STUDENT, TEACHER and ADMIN profiles
    // Access control, UserCreatedEvent, and phone verification are handled by listeners
    if (dto.profileType === ProfileType.STAFF) {
      // Get the Staff entity
      const staff = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.STAFF,
      )) as Staff;

      await this.typeSafeEventEmitter.emitAsync(
        StaffEvents.CREATE,
        new CreateStaffEvent(
          createdUser,
          userProfile,
          actor,
          staff,
          centerId,
          dto.roleId,
          isCenterAccessActive,
        ),
      );
    } else if (dto.profileType === ProfileType.STUDENT) {
      // Get the Student entity
      const student = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.STUDENT,
      )) as Student;

      await this.typeSafeEventEmitter.emitAsync(
        StudentEvents.CREATE,
        new CreateStudentEvent(
          createdUser,
          userProfile,
          actor,
          student,
          centerId,
          isCenterAccessActive,
        ),
      );
    } else if (dto.profileType === ProfileType.TEACHER) {
      // Get the Teacher entity
      const teacher = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.TEACHER,
      )) as Teacher;

      await this.typeSafeEventEmitter.emitAsync(
        TeacherEvents.CREATE,
        new CreateTeacherEvent(
          createdUser,
          userProfile,
          actor,
          teacher,
          centerId,
          isCenterAccessActive,
        ),
      );
    } else if (dto.profileType === ProfileType.ADMIN) {
      // Get the Admin entity
      const admin = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.ADMIN,
      )) as Admin;

      await this.typeSafeEventEmitter.emitAsync(
        AdminEvents.CREATE,
        new CreateAdminEvent(
          createdUser,
          userProfile,
          actor,
          admin,
          dto.roleId,
          isCenterAccessActive,
        ),
      );
    }

    return userProfile;
  }
}
