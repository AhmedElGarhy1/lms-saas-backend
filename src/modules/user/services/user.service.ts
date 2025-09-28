import { ConflictException, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundException,
  InsufficientPermissionsException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ProfileService } from './profile.service';
import { UserEventEmitter } from '@/shared/common/events/user.events';
import { LoggerService } from '@/shared/services/logger.service';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { UpdateUserRequestDto } from '../dto/update-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import {
  UserListQuery,
  CreateUserParams,
  UpdateUserParams,
  ChangePasswordParams,
  ToggleUserStatusParams,
  DeleteUserParams,
  RestoreUserParams,
  GetProfileParams,
  GetCurrentUserProfileParams,
  HandleUserCenterAccessParams,
  ActivateUserParams,
  UserServiceResponse,
  UserListResponse,
  UserStatsResponse,
  CurrentUserProfileResponse,
} from '../interfaces/user-service.interface';
import { User } from '../entities/user.entity';
import { UserOnCenter } from '@/modules/access-control/entities/user-on-center.entity';
import { ScopeEnum } from '@/shared/common/constants/role-scope.enum';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { CentersService } from '@/modules/centers/services/centers.service';

// UserListQuery interface moved to user-service.interface.ts

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
    private readonly rolesService: RolesService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly profileService: ProfileService,
    private readonly userEventEmitter: UserEventEmitter,
    private readonly logger: LoggerService,
    private readonly centersService: CentersService,
  ) {}

  async getProfile(params: GetProfileParams): Promise<User> {
    const { userId, centerId, currentUserId } = params;
    // First check if the user exists
    const user = await this.userRepository.findWithRelations(userId);

    // Then check if current user can access the target user
    if (currentUserId && currentUserId !== userId) {
      try {
        await this.accessControlHelperService.canUserAccess({
          granterUserId: currentUserId,
          targetUserId: userId,
          centerId,
        });
      } catch {
        throw new InsufficientPermissionsException(
          'Access denied to this user',
        );
      }
    }

    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Then check if current user can access the target user
    if (currentUserId && currentUserId !== userId) {
      try {
        await this.accessControlHelperService.canUserAccess({
          granterUserId: currentUserId,
          targetUserId: userId,
          centerId,
        });
      } catch {
        throw new InsufficientPermissionsException(
          'Access denied to this user',
        );
      }
    }

    // Filter centers based on access if centerId is provided
    if (centerId) {
      const centerAccess =
        await this.accessControlHelperService.findCenterAccess({
          userId: currentUserId || userId,
          centerId,
        });
      if (!centerAccess) {
        throw new InsufficientPermissionsException(
          'Access denied to this center',
        );
      }

      // Filter to only show the specific center
      user.centers = user.centers.filter(
        (center) => center.centerId === centerId,
      );
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findWithRelations(userId);
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new ResourceNotFoundException('User not found');
    }

    if (!user.profile) {
      throw new ResourceNotFoundException('User profile not found');
    }

    // Update common profile fields
    const profileUpdateData: Partial<any> = {}; // Changed Profile to any as Profile type is removed
    if ('phone' in dto && dto.phone !== undefined)
      profileUpdateData.phone = dto.phone;
    if ('address' in dto && dto.address !== undefined)
      profileUpdateData.address = dto.address;

    // Update profile using ProfileService
    await this.profileService.updateProfile(user.profile.id, profileUpdateData);

    // Return updated user
    const updated = await this.userRepository.findWithRelations(userId);
    return updated;
  }

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

    this.logger.log(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully', success: true };
  }

  async createUser(dto: CreateUserRequestDto): Promise<User> {
    this.logger.info(`Creating user: ${dto.email}`);
    // TODO: before creattion check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
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

    this.logger.info(`User created: ${savedUser.email}`);

    return savedUser;
  }

  /**
   * Handle center access and role assignments for a user
   */
  async handleUserCenterAccess(
    userId: string,
    dto: CreateUserRequestDto,
    currentUserId: string,
  ): Promise<void> {
    const currentUserRole =
      await this.accessControlHelperService.getUserHighestRole(currentUserId);
    const currentUserRoleType = currentUserRole?.role?.type;
    if (dto.centerAccess && dto.centerAccess.length > 0) {
      for (const centerAccess of dto.centerAccess) {
        // If centerId is provided, create user-center relationship
        if (centerAccess.centerId) {
          await this.accessControlService.grantCenterAccessValidate(
            userId,
            centerAccess.centerId,
            currentUserId,
          );
        }

        // Assign roles (can be global roles if centerId is null)
        for (const roleId of centerAccess.roleIds) {
          await this.rolesService.assignRole({
            userId,
            roleId: roleId,
            centerId: centerAccess.centerId || undefined,
          });
        }

        // Grant access to the creator if currentUserId is provided and centerId exists
        if (
          currentUserId !== userId &&
          ((currentUserRoleType === RoleType.ADMIN && !centerAccess.centerId) ||
            currentUserRoleType === RoleType.USER)
        ) {
          try {
            await this.accessControlService.grantUserAccess({
              userId: currentUserId,
              granterUserId: currentUserId,
              targetUserId: userId,
              centerId: centerAccess.centerId,
            });
            this.logger.info(
              `User access granted from ${currentUserId} to ${userId} for center ${centerAccess.centerId}`,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to grant user access for center ${centerAccess.centerId}: ${error.message}`,
            );
          }
        }
      }
    }
  }

  async listUsers(params: UserListQuery) {
    const { userId, centerId } = params;
    const userRole =
      await this.accessControlHelperService.getUserHighestRole(userId);

    if (!userRole) {
      throw new InsufficientPermissionsException('Access denied to this user');
    }

    if (
      ![RoleType.SUPER_ADMIN, RoleType.ADMIN].includes(userRole.role?.type) &&
      !centerId
    ) {
      throw new InsufficientPermissionsException('Access denied to this user');
    }

    if (centerId) {
      await this.accessControlHelperService.validateCenterAccess({
        userId,
        centerId,
      });
    }

    const result = await this.userRepository.paginateUsers(
      params,
      userRole?.role?.type ?? RoleType.USER,
    );

    // Always remove sensitive data
    const sanitizedData = result.items.map((user: User) => {
      const { password, twoFactorSecret, ...userData } = user;
      return userData;
    });

    return {
      ...result,
      items: sanitizedData,
    };
  }

  async deleteUser(userId: string, currentUserId: string): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Then check if current user can delete the target user
    if (currentUserId !== userId) {
      try {
        await this.accessControlHelperService.canUserAccess({
          granterUserId: currentUserId,
          targetUserId: userId,
          centerId: undefined,
        });
      } catch {
        throw new InsufficientPermissionsException(
          'Access denied to this user',
        );
      }
    }

    // Delete user with cascade
    await this.deleteUserWithCascade(currentUserId, userId);

    this.logger.log(`User deleted: ${userId} by ${currentUserId}`);
  }

  async restoreUser(userId: string, currentUserId: string): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Then check if current user can restore the target user
    try {
      await this.accessControlHelperService.canUserAccess({
        granterUserId: currentUserId,
        targetUserId: userId,
        centerId: undefined,
      });
    } catch {
      throw new InsufficientPermissionsException('Access denied to this user');
    }

    // Restore user
    await this.userRepository.restore(userId);

    this.logger.log(`User restored: ${userId} by ${currentUserId}`);
  }

  private async deleteUserWithCascade(
    currentUserId: string,
    userId: string,
  ): Promise<void> {
    // 1. Delete user roles - this would need to be implemented in RolesService
    // For now, we'll skip this step as it requires getting all user roles first
    // await this.rolesService.removeAllUserRoles(userId);

    // 2. Delete user access grants (UserAccess - where user is granter)
    await this.accessControlService.revokeUserAccessValidate({
      userId: userId,
      granterUserId: userId,
      targetUserId: userId,
    });

    // 3. Delete user center memberships (UserOnCenter)
    const userCentersResult =
      await this.accessControlHelperService.getUserCenters(userId);
    const userCenters = userCentersResult.map((center: UserOnCenter) => ({
      centerId: center.centerId || center.id,
    }));

    for (const userCenter of userCenters) {
      await this.accessControlService.revokeCenterAccess(
        currentUserId,
        userId,
        userCenter.centerId,
      );
    }

    // 4. Delete user profile
    const profile = await this.profileService.findProfileByUserId(userId);
    if (profile) {
      await this.profileService.deleteUserProfile(userId);
    }

    // 5. Soft delete the user
    await this.userRepository.softDelete(userId);
  }

  async activateUser(
    userId: string,
    dto: { isActive: boolean; centerId?: string },
    currentUserId: string,
  ): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Then check if current user can activate/deactivate the target user
    try {
      await this.accessControlHelperService.canUserAccess({
        granterUserId: currentUserId,
        targetUserId: userId,
        centerId: undefined,
      });
    } catch {
      throw new InsufficientPermissionsException('Access denied to this user');
    }

    // Update global activation status
    await this.userRepository.update(userId, { isActive: dto.isActive });

    // Update center-specific activation if centerId is provided
    if (dto.centerId) {
      // Update center-specific user activation status
      await this.accessControlService.updateUserCenterActivation(
        userId,
        dto.centerId,
        dto.isActive,
      );
    }

    this.logger.log(
      `User activation status updated: ${userId} to ${dto.isActive} by ${currentUserId}`,
    );
  }

  // Auth-related methods

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findUserById(id: string): Promise<User | null> {
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
    params: GetCurrentUserProfileParams,
  ): Promise<CurrentUserProfileResponse> {
    const { userId, centerId } = params;
    try {
      // Get user with profile
      const user = await this.userRepository.findWithRelations(userId);
      if (!user) {
        throw new ResourceNotFoundException('User not found');
      }

      this.logger.log(`Found user: ${user.id} - ${user.name}`);

      const userCenters =
        await this.accessControlHelperService.getUserCenters(userId);

      // Combine and deduplicate centers
      const allCenters = [
        ...userCenters.map((uc) => ({
          id: uc.centerId,
          name: uc.center?.name || 'Unknown Center',
          accessType: 'user' as const,
          isActive: uc.isActive,
        })),
      ];
      const uniqueCenters = allCenters.filter(
        (center, index, self) =>
          index === self.findIndex((c) => c.id === center.id),
      );

      this.logger.log(`Unique centers: ${uniqueCenters.length}`);

      // Determine context based on centerId
      let context: any;
      if (centerId) {
        // CENTER scope - get center-specific context
        const center = uniqueCenters.find((c) => c.id === centerId);
        if (!center) {
          throw new ResourceNotFoundException(
            'Center not found or access denied',
          );
        }

        let centerRoles;
        try {
          centerRoles = await this.rolesService.getUserRolesForScope(
            userId,
            'CENTER',
            centerId,
          );
        } catch (error) {
          this.logger.error(
            `Error getting center roles for ${userId} in center ${centerId}:`,
            error,
          );
          throw error;
        }
        // Get permissions using the helper service

        const isAdminInCenter = centerRoles.some(
          (role) => role.role?.type === RoleType.CENTER_ADMIN,
        );

        context = {
          center: {
            id: center.id,
            name: center.name,
          },
          roles: centerRoles.map((role) => ({
            id: role.role?.id,
            name: role.role?.name,
            type: role.role?.type,
          })),
          isAdmin: isAdminInCenter,
        };
      } else {
        // ADMIN scope - get global context
        let globalRoles;
        try {
          globalRoles = await this.rolesService.getUserRolesForScope(
            userId,
            ScopeEnum.ADMIN,
          );
        } catch (error) {
          this.logger.error(`Error getting global roles for ${userId}:`, error);
          throw error;
        }

        const isCenterAdmin = globalRoles.some(
          (role) => role.role?.type === RoleType.CENTER_ADMIN,
        );

        context = {
          center: null,
          roles: globalRoles.map((role) => ({
            id: role.role?.id,
            name: role.role?.name,
            type: role.role?.type,
          })),
          isAdmin: isCenterAdmin,
        };
      }

      let permissions;
      try {
        permissions =
          await this.accessControlHelperService.getUserPermissions(userId);
        context.permissions = permissions;
      } catch (error) {
        this.logger.error(
          `Error getting user permissions for ${userId}:`,
          error,
        );
        throw error;
      }

      // Determine if user is global admin
      let globalRoles;
      try {
        globalRoles = await this.rolesService.getUserRolesForScope(
          userId,
          ScopeEnum.ADMIN,
        );
      } catch (error) {
        this.logger.error(
          `Error getting global roles for admin check for ${userId}:`,
          error,
        );
        throw error;
      }
      const isGlobalAdmin = globalRoles.some(
        (role) =>
          role.role?.type === RoleType.SUPER_ADMIN ||
          role.role?.type === RoleType.ADMIN,
      );

      // Build centers list (simplified without context)
      const centersWithContext = uniqueCenters.map((center) => ({
        id: center.id,
        name: center.name,
        accessType: center.accessType,
        isActive: center.isActive,
      }));

      this.logger.log(`Returning profile for user: ${userId}`);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
        failedLoginAttempts: user.failedLoginAttempts,
        lockoutUntil: user.lockoutUntil,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile
          ? {
              phone: user.profile.phone,
              address: user.profile.address,
              dateOfBirth: user.profile.dateOfBirth,
            }
          : undefined,
        centers: centersWithContext,
        context,
        isAdmin: isGlobalAdmin,
      };
    } catch (error) {
      this.logger.error(
        `Error in getCurrentUserProfile for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update basic user information (name, email, isActive)
   * This method updates fields directly on the user entity
   */
  async updateUser(
    userId: string,
    updateData: {
      name?: string;
      email?: string;
      isActive?: boolean;
    },
    currentUserId?: string,
  ): Promise<User> {
    this.logger.info(
      `Updating user ${userId} with data:`,
      'UserService',
      updateData,
    );

    // Validate user access
    if (currentUserId) {
      await this.accessControlHelperService.canUserAccess({
        granterUserId: currentUserId,
        targetUserId: userId,
        centerId: undefined,
      });
    }

    // Prepare update data (only include fields that are provided)
    const userUpdateData: Partial<User> = {};
    if (updateData.name !== undefined) userUpdateData.name = updateData.name;
    if (updateData.email !== undefined) userUpdateData.email = updateData.email;
    if (updateData.isActive !== undefined)
      userUpdateData.isActive = updateData.isActive;

    // Update user using repository
    await this.userRepository.update(userId, userUpdateData);

    // Return updated user
    const updatedUser = await this.userRepository.findWithRelations(userId);
    if (!updatedUser) {
      throw new ResourceNotFoundException('User not found after update');
    }

    this.logger.info(`User ${userId} updated successfully`);
    return updatedUser;
  }
}
