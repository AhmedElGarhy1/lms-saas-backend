import { Injectable, Logger } from '@nestjs/common';
import { UserErrors } from '../exceptions/user.errors';
import { AuthErrors } from '@/modules/auth/exceptions/auth.errors';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserInfoService } from './user-info.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { FileService } from '@/modules/file/services/file.service';
import { BaseService } from '@/shared/common/services/base.service';
import { CreateUserDto } from '../dto/create-user.dto';
import {
  ChangePasswordParams,
  UserServiceResponse,
} from '../interfaces/user-service.interface';
import { User } from '../entities/user.entity';
import { PaginateUsersDto } from '../dto/paginate-users.dto';
import { PaginateTeacherDto } from '@/modules/teachers/dto/paginate-teacher.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserResponseDto } from '../dto/user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { PasswordChangedEvent } from '@/modules/auth/events/auth.events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { CenterAccessDto } from '@/modules/access-control/dto/center-access.dto';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { UserEvents } from '@/shared/events/user.events.enum';
import {
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
} from '../events/user.events';
import { VerificationService } from '@/modules/auth/services/verification.service';
import { VerificationType } from '@/modules/auth/enums/verification-type.enum';
import { SelfProtectionService } from '@/shared/common/services/self-protection.service';
import { RoleHierarchyService } from '@/shared/common/services/role-hierarchy.service';

@Injectable()
export class UserService extends BaseService {
  private readonly logger: Logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userInfoService: UserInfoService,
    private readonly userProfileService: UserProfileService,
    private readonly eventEmitter: TypeSafeEventEmitter,
    private readonly verificationService: VerificationService,
    private readonly fileService: FileService,
    private readonly selfProtectionService: SelfProtectionService,
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {
    super();
  }

  async changePassword(
    params: ChangePasswordParams,
  ): Promise<UserServiceResponse> {
    const { userId, dto } = params;
    const user = await this.findOne(userId, true);
    if (!user) {
      throw UserErrors.userNotFound();
    }

    // Validate user is active
    if (!user.isActive) {
      throw UserErrors.userInactive();
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw UserErrors.currentPasswordInvalid();
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // If OTP code not provided, send OTP and throw exception
      if (!dto.code) {
        await this.verificationService.sendTwoFactorOTP(user.id || '');
        throw AuthErrors.otpRequired();
      }

      // OTP code provided, verify it
      try {
        await this.verificationService.verifyCode(
          dto.code,
          VerificationType.TWO_FACTOR_AUTH,
          user.id,
        );
      } catch (error: unknown) {
        this.logger.error('Invalid 2FA OTP code provided for password change', {
          userId: user.id,
          phone: user.phone,
          error: error instanceof Error ? error.message : String(error),
        });
        throw AuthErrors.otpInvalid();
      }
    }

    // Update password (entity hook will hash it automatically via update() -> save())
    await this.userRepository.update(userId, { password: dto.newPassword });

    // Emit event for activity logging
    // Use the user as the actor since password change is a user action
    await this.eventEmitter.emitAsync(
      AuthEvents.PASSWORD_CHANGED,
      new PasswordChangedEvent(userId, user as ActorUser),
    );

    return {
      message: 'Password changed successfully',
      success: true,
    };
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    // Create user (entity hook will hash password automatically)
    // Database unique constraint will handle phone uniqueness
    const savedUser = await this.userRepository.create({
      password: dto.password,
      name: dto.name,
      isActive: dto.isActive ?? true,
      phone: dto.phone,
      phoneVerified: new Date(),
    });

    // Create user info with provided details or default
    await this.userInfoService.createUserInfo(savedUser.id, {
      address: dto.userInfo.address,
      dateOfBirth: dto.userInfo.dateOfBirth
        ? new Date(dto.userInfo.dateOfBirth)
        : undefined,
      locale: dto.userInfo.locale,
      userId: savedUser.id,
    });

    return savedUser;
  }

  async paginateStaff(params: PaginateUsersDto, actor: ActorUser) {
    const result = await this.userRepository.paginateStaff(params, actor);
    await this.fileService.attachUrls(
      result.items,
      'avatarFileId',
      'avatarUrl',
    );
    return result;
  }

  async paginateStudents(params: PaginateUsersDto, actor: ActorUser) {
    const result = await this.userRepository.paginateStudents(params, actor);
    await this.fileService.attachUrls(
      result.items,
      'avatarFileId',
      'avatarUrl',
    );
    return result;
  }

  async paginateTeachers(
    params: PaginateUsersDto,
    actor: ActorUser,
  ): Promise<Pagination<UserResponseDto>> {
    const result = await this.userRepository.paginateTeachers(
      params as PaginateTeacherDto,
      actor,
    );
    await this.fileService.attachUrls(
      result.items,
      'avatarFileId',
      'avatarUrl',
    );
    return result;
  }

  async countStudentsForCenter(centerId: string): Promise<number> {
    return this.userRepository.countStudentsForCenter(centerId);
  }

  async countTeachersForCenter(centerId: string): Promise<number> {
    return this.userRepository.countTeachersForCenter(centerId);
  }

  async countStaffForCenter(centerId: string): Promise<number> {
    return this.userRepository.countStaffForCenter(centerId);
  }

  async paginateUsers(params: PaginateUsersDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;

    const result = await this.userRepository.paginateStaff(params, actor);
    await this.fileService.attachUrls(
      result.items,
      'avatarFileId',
      'avatarUrl',
    );

    return result;
  }

  async paginateAdmins(params: PaginateUsersDto, actor: ActorUser) {
    const result = await this.userRepository.paginateAdmins(params, actor);
    await this.fileService.attachUrls(
      result.items,
      'avatarFileId',
      'avatarUrl',
    );
    return result;
  }

  async deleteUser(userId: string, actor: ActorUser): Promise<void> {
    // Get user profile ID from userId for self-protection check
    const userProfiles =
      await this.userProfileService.findUserProfilesByUserId(userId);
    if (userProfiles.length > 0) {
      // Check against all user profiles - if actor matches any, prevent deletion
      for (const profile of userProfiles) {
        this.selfProtectionService.validateNotSelf(
          actor.userProfileId,
          profile.id,
        );
      }

      // Role hierarchy check - check all user profiles for the user
      // Use actor.centerId if available, can be undefined for global operations
      for (const profile of userProfiles) {
        await this.roleHierarchyService.validateCanOperateOnUser(
          actor.userProfileId,
          profile.id,
          actor.centerId, // Optional - use actor's centerId if available, undefined for global operations
        );
      }
    }

    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw UserErrors.userNotFound();
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw UserErrors.userDeletionForbidden();
    }
    await this.userRepository.softRemove(userId);

    // Emit event after work is done
    await this.eventEmitter.emitAsync(
      UserEvents.DELETED,
      new UserDeletedEvent(userId, actor),
    );
  }

  async restoreUser(userId: string, actor: ActorUser): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOneSoftDeletedById(userId);
    if (!user) {
      throw UserErrors.userNotFound();
    }

    // Get user profiles for hierarchy check
    const userProfiles =
      await this.userProfileService.findUserProfilesByUserId(userId);
    if (userProfiles.length > 0) {
      // Role hierarchy check - check all user profiles for the user
      // Use actor.centerId if available, can be undefined for global operations
      for (const profile of userProfiles) {
        await this.roleHierarchyService.validateCanOperateOnUser(
          actor.userProfileId,
          profile.id,
          actor.centerId, // Optional - use actor's centerId if available, undefined for global operations
        );
      }
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw UserErrors.userRestorationForbidden();
    }

    // Restore user
    await this.userRepository.restore(userId);

    // Emit event after work is done
    await this.eventEmitter.emitAsync(
      UserEvents.RESTORED,
      new UserRestoredEvent(userId, actor),
    );
  }

  async deleteCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    return this.accessControlService.softRemoveCenterAccess(body, actor);
  }

  async restoreCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    return this.accessControlService.restoreCenterAccess(body, actor);
  }

  async activateUser(
    userId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    // Get user profile ID from userId for self-protection check
    const userProfiles =
      await this.userProfileService.findUserProfilesByUserId(userId);
    if (userProfiles.length > 0) {
      // Check against all user profiles - if actor matches any, prevent activation/deactivation
      for (const profile of userProfiles) {
        this.selfProtectionService.validateNotSelf(
          actor.userProfileId,
          profile.id,
        );
      }

      // Role hierarchy check - check all user profiles for the user
      // Use actor.centerId if available, can be undefined for global operations
      for (const profile of userProfiles) {
        await this.roleHierarchyService.validateCanOperateOnUser(
          actor.userProfileId,
          profile.id,
          actor.centerId, // Optional - use actor's centerId if available, undefined for global operations
        );
      }
    }

    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw UserErrors.userNotFound();
    }

    // Then check if current user can activate/deactivate the target user
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId, // Use actor's profileId for validation
    });

    // Update global activation status
    await this.userRepository.update(userId, { isActive });

    // Emit event after work is done
    await this.eventEmitter.emitAsync(
      UserEvents.ACTIVATED,
      new UserActivatedEvent(userId, isActive, actor),
    );
  }

  async activateProfileUser(
    userProfileId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId,
    });

    await this.userProfileService.activateProfileUser(
      userProfileId,
      isActive,
      actor,
    );
  }

  async activateCenterAccess(
    userProfileId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    if (!actor.centerId) {
      throw UserErrors.userCenterRequired();
    }
    await this.accessControlService.activateCenterAccess(
      {
        centerId: actor.centerId,
        userProfileId: userProfileId,
      },
      isActive,
      actor,
    );
  }

  // Auth-related methods

  async findUserByPhone(
    phone: string,
    withSensitiveData: boolean = false,
  ): Promise<User | null> {
    if (withSensitiveData) {
      return this.userRepository.findByPhoneWithSensitiveData(phone);
    }
    return this.userRepository.findByPhone(phone);
  }

  async findOne(
    id: string,
    withSensitiveData: boolean = false,
  ): Promise<User | null> {
    if (withSensitiveData) {
      return this.userRepository.findOneWithSensitiveData(id);
    }
    return this.userRepository.findOne(id);
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
  ) {
    return this.userRepository.findStaffUserByProfileId(
      userProfileId,
      actor,
      includeDeleted,
    );
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
    return this.userRepository.findStudentUserByProfileId(
      userProfileId,
      actor,
      includeDeleted,
    );
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
    return this.userRepository.findTeacherUserByProfileId(
      userProfileId,
      actor,
      includeDeleted,
    );
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
  ) {
    return this.userRepository.findAdminUserByProfileId(
      userProfileId,
      actor,
      includeDeleted,
    );
  }

  async findUserByProfileId(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<User | null> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
    });
    // Find user by profileId - need to get user from profile
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw UserErrors.userNotFound();
    }
    return this.userRepository.findOne(userProfile.userId);
  }

  async updateUserTwoFactor(
    userId: string,
    twoFactorEnabled: boolean,
  ): Promise<void> {
    await this.userRepository.updateUserTwoFactor(userId, twoFactorEnabled);
  }

  async update(userId: string, updateData: Partial<User>): Promise<void> {
    // BaseRepository.update() uses save() internally, which triggers entity hooks
    await this.userRepository.update(userId, updateData);
  }

  async updateUser(
    userId: string,
    updateData: UpdateUserDto,
    actor: ActorUser,
  ): Promise<User> {
    // Get user profile ID from userId for self-protection check
    const userProfiles =
      await this.userProfileService.findUserProfilesByUserId(userId);
    if (userProfiles.length > 0) {
      // Check against all user profiles - if actor matches any, prevent update
      for (const profile of userProfiles) {
        this.selfProtectionService.validateNotSelf(
          actor.userProfileId,
          profile.id,
        );
      }

      // Role hierarchy check - check all user profiles for the user
      // Use actor.centerId if available, can be undefined for global operations
      for (const profile of userProfiles) {
        await this.roleHierarchyService.validateCanOperateOnUser(
          actor.userProfileId,
          profile.id,
          actor.centerId, // Optional - use actor's centerId if available, undefined for global operations
        );
      }
    }

    // Fetch user to validate it's active
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw UserErrors.userNotFound();
    }
    if (!user.isActive) {
      throw UserErrors.userInactive();
    }

    const { userInfo, ...userData } = updateData;
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId,
    });
    // Database unique constraint will handle phone uniqueness
    if (userInfo) {
      await this.userInfoService.updateUserInfo(userId, userInfo);
    }

    console.log('updating user', userId);
    const updatedUser = (await this.userRepository.update(userId, userData))!;
    // Determine which fields were updated
    const updatedFields = Object.keys(userData);
    // Emit event after work is done
    await this.eventEmitter.emitAsync(
      UserEvents.UPDATED,
      new UserUpdatedEvent(updatedUser, updatedFields, actor),
    );

    return updatedUser;
  }

  /**
   * Update user's avatar file reference
   */
  async updateUserAvatar(userId: string, avatarFileId: string): Promise<User> {
    // Get current user to check for existing avatar
    const currentUser = await this.userRepository.findOne(userId);
    if (!currentUser) {
      throw UserErrors.userNotFound();
    }

    // Validate user is active
    if (!currentUser.isActive) {
      throw UserErrors.userInactive();
    }

    // If user has existing avatar, clean it up
    if (currentUser.avatarFileId && currentUser.avatarFileId !== avatarFileId) {
      // Delete old avatar file from R2 and database
      await this.fileService.deleteFile(currentUser.avatarFileId);
    }

    // Update user with new avatar
    const updatedUser = await this.userRepository.update(userId, {
      avatarFileId,
    });

    if (!updatedUser) {
      throw UserErrors.userNotFound();
    }

    this.logger.log(
      `Updated avatar for user: ${userId} with file: ${avatarFileId}`,
    );

    return updatedUser;
  }

  // Methods that work with userProfileId
  async updateUserByProfileId(
    userProfileId: string,
    updateData: UpdateUserDto,
    actor: ActorUser,
  ): Promise<User> {
    // Self-protection check - applies to ALL updates
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

    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
    });

    // Find user by profileId
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw UserErrors.userNotFound();
    }

    // Call updateUser which will handle the work and emit event
    return this.updateUser(userProfile.userId, updateData, actor);
  }

  async deleteUserByProfileId(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    // Find user by profileId
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw UserErrors.userNotFound();
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw UserErrors.userDeletionForbidden();
    }

    await this.userRepository.softRemove(userProfile.userId);
  }

  async restoreUserByProfileId(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    // Find user by profileId
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw UserErrors.userNotFound();
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw UserErrors.userRestorationForbidden();
    }

    await this.userRepository.restore(userProfile.userId);
  }
}
