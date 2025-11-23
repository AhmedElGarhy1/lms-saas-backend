import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  ResourceNotFoundException,
  InsufficientPermissionsException,
  ValidationFailedException,
  UserAlreadyExistsException,
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
import { ActorUser } from '@/shared/common/types/actor-user.type';
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
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

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
    private readonly i18n: I18nService<I18nTranslations>,
  ) {
    super();
  }

  async changePassword(
    params: ChangePasswordParams,
  ): Promise<UserServiceResponse> {
    const { userId, dto } = params;
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.userNotFound'),
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new ValidationFailedException(
        this.i18n.translate('errors.currentPasswordIncorrect'),
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // Update password
    await this.userRepository.update(userId, { password: hashedPassword });

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      AuthEvents.PASSWORD_CHANGED,
      new PasswordChangedEvent(userId, { id: userId } as ActorUser),
    );

    return {
      message: this.i18n.translate('success.passwordChange'),
      success: true,
    };
  }

  async createUser(dto: CreateUserDto, _actor: ActorUser): Promise<User> {
    // Check for existing user by email if email is provided
    if (dto.email) {
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        throw new UserAlreadyExistsException(dto.email);
      }
    }

    // Check for existing user by phone if phone is provided
    if (dto.phone) {
      const existingUser = await this.userRepository.findByPhone(dto.phone);
      if (existingUser) {
        throw new UserAlreadyExistsException(dto.phone);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const savedUser = await this.userRepository.create({
      email: dto.email?.toLowerCase(),
      password: hashedPassword, //TODO: do it in entity level
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

  // // TODO: implement this method
  // async createUserWithRole(dto: CreateUserWithRoleDto, actor: ActorUser) {
  //   const centerId = (dto.centerId ?? actor.centerId)!;
  //   dto.centerId = centerId;
  //   const user = await this.createUser(dto, actor);

  //   // Create user profile for the new user
  //   const userProfile = await this.userProfileService.createUserProfile(
  //     user.id,
  //     ProfileType.STAFF, // Default to Staff for center users
  //     user.id, // Use user.id as profileRefId for now
  //   );

  //   // Grant center access to the new user
  //   if (centerId) {
  //     await this.accessControlService.grantCenterAccess(
  //       {
  //         userProfileId: userProfile.id,
  //         centerId,
  //       },
  //       actor,
  //     );
  //   }

  //   // Grant user access (granter can manage the new user)
  //   const bypassUserAccess =
  //     await this.accessControlHelperService.bypassCenterInternalAccess(
  //       actor.userProfileId,
  //       centerId,
  //     );
  //   if (!bypassUserAccess) {
  //     await this.accessControlService.grantUserAccessInternal({
  //       granterUserProfileId: actor.userProfileId,
  //       targetUserProfileId: userProfile.id,
  //       centerId,
  //     });
  //   }

  //   if (dto.roleId) {
  //     await this.rolesService.assignRole(
  //       {
  //         userProfileId: userProfile.id,
  //         roleId: dto.roleId,
  //         centerId,
  //       },
  //       actor,
  //     );
  //   }

  //   return user;
  // }

  async paginateStaff(params: PaginateUsersDto, actor: ActorUser) {
    return this.userRepository.paginateStaff(params, actor);
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
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.userNotFound'),
      );
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException(
        this.i18n.translate('errors.accessDeniedToUser'),
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
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.userNotFound'),
      );
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException(
        this.i18n.translate('errors.accessDeniedToUser'),
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
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.userNotFound'),
      );
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
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.resourceNotFound'),
      );
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

  async findUserByEmail(
    email: string,
    withSensitiveData: boolean = false,
  ): Promise<User | null> {
    if (withSensitiveData) {
      return this.userRepository.findByEmailWithSensitiveData(email);
    }
    return this.userRepository.findByEmail(email);
  }

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
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.resourceNotFound'),
      );
    }
    return this.userRepository.findOne(userProfile.userId);
  }


  async updateUserTwoFactor(
    userProfileId: string,
    twoFactorSecret: string | null | undefined,
    twoFactorEnabled: boolean,
  ): Promise<void> {
    // Find user by profileId
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.resourceNotFound'),
      );
    }
    await this.userRepository.updateUserTwoFactor(
      userProfile.userId,
      twoFactorSecret || null,
      twoFactorEnabled,
    );
  }

  async update(userId: string, updateData: Partial<User>): Promise<void> {
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

    await this.userInfoService.updateUserInfo(userId, updateData.userInfo);

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
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.resourceNotFound'),
      );
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
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.resourceNotFound'),
      );
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException(
        this.i18n.translate('errors.accessDeniedToUser'),
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
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.resourceNotFound'),
      );
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException(
        this.i18n.translate('errors.accessDeniedToUser'),
      );
    }

    await this.userRepository.restore(userProfile.userId);
  }
}
