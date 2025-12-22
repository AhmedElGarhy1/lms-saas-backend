import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  ResourceNotFoundException,
  InsufficientPermissionsException,
  ValidationFailedException,
  OtpRequiredException,
  AuthenticationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserInfoService } from './user-info.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { BaseService } from '@/shared/common/services/base.service';
import { CreateUserDto } from '../dto/create-user.dto';
import {
  ChangePasswordParams,
  UserServiceResponse,
} from '../interfaces/user-service.interface';
import { User } from '../entities/user.entity';
import { CentersService } from '@/modules/centers/services/centers.service';
import { PaginateUsersDto } from '../dto/paginate-users.dto';
import { PaginateTeacherDto } from '@/modules/teachers/dto/paginate-teacher.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserResponseDto } from '../dto/user-response.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
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

@Injectable()
export class UserService extends BaseService {
  private readonly logger: Logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
    private readonly rolesService: RolesService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userInfoService: UserInfoService,
    private readonly userProfileService: UserProfileService,
    private readonly centersService: CentersService,
    private readonly activityLogService: ActivityLogService,
    private readonly eventEmitter: TypeSafeEventEmitter,
    private readonly verificationService: VerificationService,
  ) {
    super();
  }

  async changePassword(
    params: ChangePasswordParams,
  ): Promise<UserServiceResponse> {
    const { userId, dto } = params;
    const user = await this.findOne(userId, true);
    if (!user) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.user',
        identifier: 't.resources.identifier',
        value: userId,
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new ValidationFailedException('t.messages.fieldInvalid', [], {
        field: 't.resources.currentPassword',
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // If OTP code not provided, send OTP and throw exception
      if (!dto.code) {
        await this.verificationService.sendTwoFactorOTP(user.id || '');
        throw new OtpRequiredException('t.messages.fieldRequired', {
          field: 'OTP code',
        });
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
        throw new AuthenticationFailedException('t.messages.operationError', {
          reason: 'authentication failed',
        });
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
    return this.userRepository.paginateStaff(params, actor);
  }

  async paginateStudents(params: PaginateUsersDto, actor: ActorUser) {
    return this.userRepository.paginateStudents(params, actor);
  }

  async paginateTeachers(
    params: PaginateUsersDto,
    actor: ActorUser,
  ): Promise<Pagination<UserResponseDto>> {
    return await this.userRepository.paginateTeachers(
      params as PaginateTeacherDto,
      actor,
    );
  }

  async paginateUsers(params: PaginateUsersDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;

    const result = await this.userRepository.paginateStaff(params, actor);

    return result;
  }

  async paginateAdmins(params: PaginateUsersDto, actor: ActorUser) {
    return this.userRepository.paginateAdmins(params, actor);
  }

  async deleteUser(userId: string, actor: ActorUser): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.user',
        identifier: 't.resources.identifier',
        value: userId,
      });
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException(
        't.messages.actionUnauthorized',
        {
          action: 't.buttons.delete',
          resource: 't.resources.user',
        },
      );
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
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.user',
        identifier: 't.resources.identifier',
        value: userId,
      });
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException(
        't.messages.actionUnauthorized',
        {
          action: 't.buttons.restore',
          resource: 't.resources.user',
        },
      );
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
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.user',
        identifier: 't.resources.identifier',
        value: userId,
      });
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

    // Get userId from profile for command emission
    const profile = await this.userProfileService.findOne(userProfileId);
    if (!profile) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.profile',
      });
    }

    // Emit event after work is done
    await this.eventEmitter.emitAsync(
      UserEvents.ACTIVATED,
      new UserActivatedEvent(profile.userId, isActive, actor),
    );
  }

  async activateCenterAccess(
    userProfileId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    if (!actor.centerId)
      throw new ForbiddenException(
        'You are not authorized to toggle this center access',
      );
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
  ) {
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
  ) {
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
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.profile',
      });
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
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId,
    });

    // Database unique constraint will handle phone uniqueness
    if (updateData.userInfo) {
      await this.userInfoService.updateUserInfo(userId, updateData.userInfo);
    }

    const updatedUser = (await this.userRepository.update(userId, updateData))!;

    // Determine which fields were updated
    const updatedFields = Object.keys(updateData).filter(
      (key) => key !== 'userInfo' && updateData[key as keyof UpdateUserDto],
    );

    // Emit event after work is done
    await this.eventEmitter.emitAsync(
      UserEvents.UPDATED,
      new UserUpdatedEvent(updatedUser, updatedFields, actor),
    );

    return updatedUser;
  }

  // Methods that work with userProfileId
  async updateUserByProfileId(
    userProfileId: string,
    updateData: UpdateUserDto,
    actor: ActorUser,
  ): Promise<User> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
    });

    // Find user by profileId
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.profile',
      });
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
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.profile',
      });
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException(
        't.messages.actionUnauthorized',
        {
          action: 't.buttons.delete',
          resource: 't.resources.user',
        },
      );
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
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.profile',
      });
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException(
        't.messages.actionUnauthorized',
        {
          action: 't.buttons.delete',
          resource: 't.resources.user',
        },
      );
    }

    await this.userRepository.restore(userProfile.userId);
  }
}
