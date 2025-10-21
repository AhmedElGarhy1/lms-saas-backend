import { Injectable } from '@nestjs/common';
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
import { StaffService } from './staff.service';
import { UserProfileService } from './user-profile.service';
import { LoggerService } from '@/shared/services/logger.service';
import { CreateUserDto, CreateUserWithRoleDto } from '../dto/create-user.dto';
import {
  ChangePasswordParams,
  UserServiceResponse,
  CurrentUserProfileResponse,
} from '../interfaces/user-service.interface';
import { User } from '../entities/user.entity';
import { CentersService } from '@/modules/centers/services/centers.service';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';
import { PaginateUsersDto } from '../dto/paginate-users.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateAdminsDto } from '../dto/paginate-admins.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { Transactional } from 'typeorm-transactional';

// UserListQuery interface moved to user-service.interface.ts

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
    private readonly rolesService: RolesService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userInfoService: UserInfoService,
    private readonly userProfileService: UserProfileService,
    private readonly staffService: StaffService,
    private readonly logger: LoggerService,
    private readonly centersService: CentersService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async changePassword(
    params: ChangePasswordParams,
  ): Promise<UserServiceResponse> {
    const { userId, dto } = params;
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new ValidationFailedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // Update password
    await this.userRepository.update(userId, { password: hashedPassword });

    // Log password change activity
    await this.activityLogService.log(ActivityType.PASSWORD_CHANGED, {
      targetUserId: userId,
      email: user.email,
      isSelfChange: true, // This is a self-service password change
    });

    this.logger.log(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully', success: true };
  }

  async createUser(dto: CreateUserDto, actor: ActorUser): Promise<User> {
    // Validate that at least one of email or phone is provided
    dto.validateEmailOrPhone();

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
      fullName: dto.fullName || savedUser.name,
      address: dto.address,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      locale: (dto.locale as 'en' | 'ar') || 'en',
    });

    // Create staff for user
    await this.staffService.createStaffForUser(savedUser.id);

    await this.userRepository.update(savedUser.id, savedUser);

    return savedUser;
  }

  @Transactional()
  async createUserWithRole(dto: CreateUserWithRoleDto, actor: ActorUser) {
    const centerId = (dto.centerId ?? actor.centerId)!;
    dto.centerId = centerId;
    const user = await this.createUser(dto, actor);
    if (actor.centerId) {
      await this.accessControlService.grantCenterAccess(
        {
          userId: user.id,
          centerId,
          global: false,
        },
        actor,
      );
    }

    const bypassUserAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.id,
        centerId,
      );
    if (!bypassUserAccess) {
      await this.accessControlService.grantUserAccess({
        granterUserId: actor.id,
        targetUserId: user.id,
        centerId,
      });
    }

    await this.rolesService.assignRole({
      userId: user.id,
      roleId: dto.roleId,
      centerId,
    });
    return user;
  }

  async paginateUsers(params: PaginateUsersDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;

    await this.accessControlHelperService.validateAdminAndCenterAccess({
      userId: actor.id,
      centerId,
    });

    const result = await this.userRepository.paginateUsers(params, actor.id);

    return result;
  }

  async paginateAdmins(params: PaginateAdminsDto, actor: ActorUser) {
    return this.userRepository.paginateAdmins(params, actor.id);
  }

  async deleteUser(userId: string, actor: ActorUser): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.id,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException('Access denied to this user');
    }
    await this.userRepository.softRemove(userId);

    this.logger.log(`User deleted: ${userId} by ${actor.id}`);
  }

  async restoreUser(userId: string, actor: ActorUser): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOneSoftDeleted(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.id,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException('Access denied to this user');
    }

    // Restore user
    await this.userRepository.restore(userId);
  }

  async activateUser(
    userId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Then check if current user can activate/deactivate the target user
    await this.accessControlHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: userId,
    });

    // Update global activation status
    await this.userRepository.update(userId, { isActive });

    this.logger.log(
      `User activation status updated: ${userId} to ${isActive} by ${actor.id}`,
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

  async findUserById(id: string, actor: ActorUser): Promise<User | null> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: id,
    });
    return this.userRepository.findOne(id);
  }

  async findUserProfileById(id: string, actor: ActorUser): Promise<any> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: id,
    });

    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Get user info
    const userInfo = await this.userInfoService.findUserInfoByUserId(id);
    if (!userInfo) {
      throw new ResourceNotFoundException('User info not found');
    }

    // Get user profiles
    const userProfiles =
      await this.userProfileService.findUserProfilesByUserId(id);

    // Build flattened profiles array
    const profiles = [];

    for (const userProfile of userProfiles) {
      let profileData = null;

      switch (userProfile.profileType) {
        case 'Staff':
          profileData = await this.staffService.findStaffByUserId(id);
          break;
        case 'Teacher':
          // TODO: Implement when TeacherService is available
          profileData = { id: userProfile.profileRefId };
          break;
        case 'Student':
          // TODO: Implement when StudentService is available
          profileData = { id: userProfile.profileRefId };
          break;
        case 'Parent':
          // TODO: Implement when ParentService is available
          profileData = { id: userProfile.profileRefId };
          break;
      }

      if (profileData) {
        profiles.push({
          type: userProfile.profileType,
          data: profileData,
        });
      }
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      failedLoginAttempts: user.failedLoginAttempts,
      lockoutUntil: user.lockoutUntil,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      userInfo: {
        id: userInfo.id,
        fullName: userInfo.fullName,
        address: userInfo.address,
        dateOfBirth: userInfo.dateOfBirth,
        locale: userInfo.locale,
        createdAt: userInfo.createdAt,
        updatedAt: userInfo.updatedAt,
      },
      profiles,
    };
  }

  async updateFailedLoginAttempts(
    userId: string,
    attempts: number,
  ): Promise<void> {
    await this.userRepository.updateFailedLoginAttempts(userId, attempts);
  }

  async updateLockoutUntil(
    userId: string,
    lockoutUntil: Date | null,
  ): Promise<void> {
    await this.userRepository.updateFailedLoginAttempts(
      userId,
      0,
      lockoutUntil || undefined,
    );
  }

  async updateUserTwoFactor(
    userId: string,
    twoFactorSecret: string | null | undefined,
    twoFactorEnabled: boolean,
  ): Promise<void> {
    await this.userRepository.updateUserTwoFactor(
      userId,
      twoFactorSecret || null,
      twoFactorEnabled,
    );
  }

  async update(userId: string, updateData: Partial<User>): Promise<void> {
    await this.userRepository.update(userId, updateData);
  }

  async getCurrentUserProfile(
    actor: ActorUser,
  ): Promise<CurrentUserProfileResponse> {
    // Get user with profile
    const user = await this.userRepository.findOne(actor.id);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    this.logger.log(`Found user: ${user.id} - ${user.name}`);

    // Determine context based on centerId
    const returnData: CurrentUserProfileResponse = {
      ...user,
      context: { role: null as unknown as UserRole },
      isAdmin: false,
    };

    const hasAdminRole = await this.accessControlHelperService.hasAdminRole(
      actor.id,
    );
    returnData.isAdmin = hasAdminRole;

    if (actor.centerId) {
      const center = await this.centersService.findCenterById(actor.centerId);
      if (center) {
        returnData.context.center = center;
        const contextRoles = await this.rolesService.findUserRole(
          actor.id,
          actor.centerId,
        );
        returnData.context.role = contextRoles as UserRole;
      }
    }
    if (!returnData.context.role) {
      const userGlobalRole = await this.accessControlHelperService.getUserRole(
        actor.id,
      );
      returnData.context.role = userGlobalRole as UserRole;
    }

    this.logger.log(`Returning profile for user: ${actor.id}`);

    return returnData;
  }

  async updateUserProfile(
    updateData: UpdateUserDto,
    actor: ActorUser,
  ): Promise<User> {
    return this.updateUser(actor.id, updateData, actor);
  }

  /**
   * Update basic user information (name, email, isActive)
   * This method updates fields directly on the user entity
   */
  @Transactional()
  async updateUser(
    userId: string,
    updateData: UpdateUserDto,
    actor: ActorUser,
  ): Promise<User> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: userId,
    });

    // Update user using repository
    // TODO: transaction
    const userInfoData: any = {};

    // Extract user info fields
    if (updateData.fullName) userInfoData.fullName = updateData.fullName;
    if (updateData.address) userInfoData.address = updateData.address;
    if (updateData.dateOfBirth)
      userInfoData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.locale) userInfoData.locale = updateData.locale;

    // Update user info if there are user info fields
    if (Object.keys(userInfoData).length > 0) {
      await this.userInfoService.updateUserInfo(userId, userInfoData);
    }

    // Remove the fields we've processed from updateData
    delete (updateData as any).fullName;
    delete (updateData as any).address;
    delete (updateData as any).dateOfBirth;
    delete (updateData as any).locale;
    const user = await this.userRepository.update(userId, updateData as any);
    return user!;
  }
}
