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
import { ProfileService } from './profile.service';
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

// UserListQuery interface moved to user-service.interface.ts

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
    private readonly rolesService: RolesService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly profileService: ProfileService,
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
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new UserAlreadyExistsException(dto.email);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const savedUser = await this.userRepository.create({
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      name: dto.name,
      isActive: dto.isActive ?? true,
    });

    // Create profile with provided details or default
    const profile = await this.profileService.createUserProfile(savedUser.id, {
      phone: dto.profile.phone,
      address: dto.profile.address,
      dateOfBirth: dto.profile.dateOfBirth
        ? new Date(dto.profile.dateOfBirth)
        : undefined,
    });
    savedUser.profileId = profile.id;
    await this.userRepository.update(savedUser.id, savedUser);

    return savedUser;
  }

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
      await this.accessControlHelperService.bypassUserAccess(
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

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne(id);
  }

  async findUserById(id: string, actor: ActorUser): Promise<User | null> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: id,
    });
    return this.userRepository.findWithRelations(id);
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
    const user = await this.userRepository.findWithRelations(actor.id);
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
    if (updateData.profile) {
      await this.profileService.updateUserProfile(userId, {
        ...updateData.profile,
        dateOfBirth: updateData.profile.dateOfBirth
          ? new Date(updateData.profile.dateOfBirth)
          : undefined,
      });
      delete (updateData as Partial<User>).profile;
    }
    const user = await this.userRepository.update(
      userId,
      updateData as Partial<User>,
    );
    return user!;
  }
}
