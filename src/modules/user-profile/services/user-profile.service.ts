import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { UserProfile } from '../entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { BaseService } from '@/shared/common/services/base.service';
import {
  ResourceNotFoundException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { CreateUserProfileDto } from '../dto/create-user-profile.dto';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { CentersService } from '@/modules/centers/services/centers.service';
import { Role } from '@/modules/access-control/entities/role.entity';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { CreateStaffEvent } from '@/modules/staff/events/staff.events';
import { CreateAdminEvent } from '@/modules/admin/events/admin.events';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';

@Injectable()
export class UserProfileService extends BaseService {
  private readonly logger: Logger = new Logger(UserProfileService.name);

  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly centerService: CentersService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  async listProfiles(actorUser: ActorUser): Promise<UserProfile[]> {
    return this.userProfileRepository.findMany({
      where: { userId: actorUser.id },
    });
  }

  async getCurrentUserProfile(actor: ActorUser): Promise<ProfileResponseDto> {
    // Get user with profile
    const user = await this.userService.findOne(actor.id);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Determine context based on centerId
    const returnData: ProfileResponseDto = {
      ...user,
      profileType: actor.profileType,
      profile: null,
    };

    if (!actor.userProfileId) return returnData;
    const userProfile = await this.findOne(actor.userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }
    actor.userProfileId = userProfile.id;
    actor.profileType = userProfile.profileType;

    if (actor.centerId) {
      const profileRole = await this.accessControlHelperService.getProfileRole(
        actor.userProfileId,
        actor.centerId,
      );
      returnData.role = profileRole?.role as Role;
      returnData.center = await this.centerService.findCenterById(
        actor.centerId,
      );
    }
    if (!returnData.role) {
      const profileRole = await this.accessControlHelperService.getProfileRole(
        actor.userProfileId,
      );
      returnData.role = profileRole?.role as Role;
    }

    const profile = await this.userProfileRepository.getTargetProfile(
      actor.userProfileId,
      actor.profileType,
    );
    if (!profile) {
      throw new ResourceNotFoundException('Profile not found');
    }

    returnData.profile = profile;
    returnData.profileType = actor.profileType;

    return returnData;
  }

  async activateProfileUser(userProfileId: string, isActive: boolean) {
    const userProfile = await this.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }
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
    // 1. Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
    });

    // 2. Get the user profile to find the userId
    const userProfile = await this.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }

    // 3. Convert profile update data to user update format
    const userUpdateData: UpdateUserDto = {
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      isActive: dto.isActive,
      userInfo: {
        address: dto.userInfo?.address,
        dateOfBirth: dto.userInfo?.dateOfBirth
          ? new Date(dto.userInfo.dateOfBirth)
          : undefined,
        locale: dto.userInfo?.locale,
      },
    };

    // 4. Update User entity (this will emit UserUpdatedEvent)
    return await this.userService.updateUser(
      userProfile.userId,
      userUpdateData,
      actor,
    );
  }

  async findForUser(userId: string, userProfileId: string) {
    return this.userProfileRepository.findForUser(userId, userProfileId);
  }

  async findOne(userProfileId: string) {
    return this.userProfileRepository.findOne(userProfileId);
  }

  async createUserProfile(
    userId: string,
    profileType: ProfileType,
    profileRefId: string,
  ): Promise<UserProfile> {
    // Check if user already has this profile type
    const existingProfile = await this.findUserProfileByType(
      userId,
      profileType,
    );
    if (existingProfile) {
      throw new ValidationFailedException(
        `User already has a ${profileType} profile`,
      );
    }

    const userProfile = await this.userProfileRepository.create({
      userId,
      profileType,
      profileRefId,
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

  async deleteUserProfile(userProfileId: string): Promise<void> {
    await this.userProfileRepository.softRemove(userProfileId);
  }

  async restoreUserProfile(userProfileId: string): Promise<void> {
    await this.userProfileRepository.restore(userProfileId);
  }

  async deleteUserProfilesByUserId(userId: string): Promise<void> {
    const userProfiles = await this.findUserProfilesByUserId(userId);
    for (const profile of userProfiles) {
      await this.deleteUserProfile(profile.id);
    }
  }

  async isAdmin(userProfileId: string) {
    return !!(await this.userProfileRepository.isAdmin(userProfileId));
  }

  async isStaff(userProfileId: string) {
    return !!(await this.userProfileRepository.isStaff(userProfileId));
  }
  async doesProfilesMatch(userProfileId: string, targetProfileId: string) {
    const userProfile = await this.findOne(userProfileId);
    const targetProfile = await this.findOne(targetProfileId);
    return {
      match: userProfile?.profileType === targetProfile?.profileType,
      profileType: userProfile?.profileType,
      targetProfileType: targetProfile?.profileType,
    };
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
    // 1. Create User entity (includes UserInfo creation)
    const createdUser = await this.userService.createUser(dto, actor);

    // 2. Get or create profileRefEntity (Staff/Admin/Teacher) based on profileType
    // Use existing profileRefId if provided, otherwise create new one
    const profileRefId =
      await this.userProfileRepository.createProfileRefEntity(dto.profileType);

    // 3. Create UserProfile linking User to profileRefEntity
    const userProfile = await this.createUserProfile(
      createdUser.id,
      dto.profileType,
      profileRefId,
    );

    // 4. Emit domain events for STAFF and ADMIN profiles
    // Access control, UserCreatedEvent, and phone verification are handled by listeners
    if (dto.profileType === ProfileType.STAFF) {
      // Get the Staff entity
      const staff = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.STAFF,
      )) as Staff;

      const centerId = dto.centerId ?? actor.centerId;
      await this.typeSafeEventEmitter.emitAsync(
        StaffEvents.CREATE,
        new CreateStaffEvent(
          createdUser,
          userProfile,
          actor,
          staff,
          centerId,
          dto.roleId,
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
        ),
      );
    }

    return userProfile;
  }
}
