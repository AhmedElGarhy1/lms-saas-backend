import { Injectable } from '@nestjs/common';
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
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { User } from '../entities/user.entity';
import { UserOnCenter } from '@/modules/access-control/entities/user-on-center.entity';
import { ScopeEnum } from '@/shared/common/constants/role-scope.enum';
import { RoleType } from '@/shared/common/enums/role-type.enum';

export interface UserListQuery {
  query: PaginationQuery;
  userId: string;
  centerId?: string;
  targetUserId?: string; // used for accessible users
}

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
  ) {}

  async getProfile(userId: string, centerId?: string, currentUserId?: string) {
    // First check if the user exists
    const user = await this.userRepository.findUserWithCenters(userId);

    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Then check if current user can access the target user
    if (currentUserId && currentUserId !== userId) {
      try {
        await this.accessControlHelperService.validateUserAccess(
          currentUserId,
          userId,
        );
      } catch {
        throw new InsufficientPermissionsException(
          'Access denied to this user',
        );
      }
    }

    // Filter centers based on access if centerId is provided
    if (centerId) {
      try {
        await this.accessControlHelperService.validateCenterAccess(
          currentUserId || userId,
          centerId,
        );
      } catch {
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

  /**
   * Get user by ID with all relations populated for edit/preview
   * Includes centers with center details and roles inside centers
   */
  async getUserByIdWithRelations(userId: string, currentUserId?: string) {
    // First check if the user exists
    const user = await this.userRepository.findUserByIdWithRelations(userId);

    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Then check if current user can access the target user
    if (currentUserId && currentUserId !== userId) {
      try {
        await this.accessControlHelperService.validateUserAccess(
          currentUserId,
          userId,
        );
      } catch {
        throw new InsufficientPermissionsException(
          'Access denied to this user',
        );
      }
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findUserForProfile(userId);
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
    const updated = await this.userRepository.findUserWithProfile(userId);
    return updated;
  }

  async changePassword(userId: string, dto: ChangePasswordRequestDto) {
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
    return { message: 'Password changed successfully' };
  }

  async createUser(
    dto: CreateUserRequestDto,
    currentUserId?: string,
  ): Promise<User> {
    this.logger.info(`Creating user: ${dto.email}`);

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
    if (dto.profile) {
      await this.profileService.createUserProfile(savedUser.id, {
        phone: dto.profile.phone,
        address: dto.profile.address,
        dateOfBirth: dto.profile.dateOfBirth
          ? new Date(dto.profile.dateOfBirth)
          : undefined,
      });
    } else {
      await this.profileService.createUserProfile(savedUser.id, {});
    }

    // Handle center access and role assignments
    await this.handleUserCenterAccess(savedUser.id, dto, currentUserId);

    this.logger.info(`User created: ${savedUser.email}`);

    return savedUser;
  }

  /**
   * Handle center access and role assignments for a user
   */
  private async handleUserCenterAccess(
    userId: string,
    dto: CreateUserRequestDto,
    currentUserId?: string,
  ): Promise<void> {
    // Handle center access with roles
    if (dto.centerAccess && dto.centerAccess.length > 0) {
      for (const centerAccess of dto.centerAccess) {
        // If centerId is provided, create user-center relationship
        if (centerAccess.centerId) {
          await this.accessControlService.addUserToCenter({
            userId,
            centerId: centerAccess.centerId,
          });
        }

        // Assign roles (can be global roles if centerId is null)
        for (const roleData of centerAccess.roles) {
          await this.rolesService.assignRole({
            userId,
            roleId: roleData.roleId,
            centerId: centerAccess.centerId || undefined,
          });
        }

        // Grant access to the creator if currentUserId is provided and centerId exists
        if (
          currentUserId &&
          currentUserId !== userId &&
          centerAccess.centerId
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
      await this.accessControlHelperService.validateCenterAccess(
        userId,
        centerId,
      );

      const result = await this.userRepository.paginateUsersInCenter(
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
    } else {
      const result = await this.userRepository.paginateAdmins(
        params,
        userRole?.role?.type,
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
        await this.accessControlHelperService.validateUserAccess(
          currentUserId,
          userId,
        );
      } catch {
        throw new InsufficientPermissionsException(
          'Access denied to this user',
        );
      }
    }

    // Delete user with cascade
    await this.deleteUserWithCascade(userId);

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
      await this.accessControlHelperService.validateUserAccess(
        currentUserId,
        userId,
      );
    } catch {
      throw new InsufficientPermissionsException('Access denied to this user');
    }

    // Restore user
    await this.userRepository.restore(userId);

    this.logger.log(`User restored: ${userId} by ${currentUserId}`);
  }

  private async deleteUserWithCascade(userId: string): Promise<void> {
    // 1. Delete user roles - this would need to be implemented in RolesService
    // For now, we'll skip this step as it requires getting all user roles first
    // await this.rolesService.removeAllUserRoles(userId);

    // 2. Delete user access grants (UserAccess - where user is granter)
    await this.accessControlService.revokeUserAccess({
      userId: userId,
      granterUserId: userId,
      targetUserId: userId,
    });

    // 3. Delete user center memberships (UserOnCenter)
    const userCentersResult =
      await this.accessControlService.getUserCenters(userId);
    const userCenters = userCentersResult.map((center: UserOnCenter) => ({
      centerId: center.centerId || center.id,
    }));

    for (const userCenter of userCenters) {
      await this.accessControlService.removeUserFromCenter({
        userId,
        centerId: userCenter.centerId,
      });
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
      await this.accessControlHelperService.validateUserAccess(
        currentUserId,
        userId,
      );
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
  async findUserWithAuthRelations(email: string): Promise<User | null> {
    return this.userRepository.findUserWithAuthRelations(email);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne(id);
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

  async getCurrentUserProfile(userId: string, centerId?: string) {
    try {
      // Get user with profile
      const user = await this.userRepository.findUserWithProfile(userId);
      if (!user) {
        throw new ResourceNotFoundException('User not found');
      }

      this.logger.log(`Found user: ${user.id} - ${user.name}`);

      // Get all centers the user has access to (both UserOnCenter and AdminCenterAccess)
      let userCenters;
      try {
        userCenters = await this.accessControlService.getUserCenters(userId);
        this.logger.log(`User centers: ${userCenters.length}`);
      } catch (error) {
        this.logger.error(`Error getting user centers for ${userId}:`, error);
        throw error;
      }

      let adminCenterAccess;
      try {
        adminCenterAccess =
          await this.accessControlService.getAdminCenterAccess(userId);
        this.logger.log(`Admin center access: ${adminCenterAccess.length}`);
      } catch (error) {
        this.logger.error(
          `Error getting admin center access for ${userId}:`,
          error,
        );
        throw error;
      }

      // Combine and deduplicate centers
      const allCenters = [
        ...userCenters.map((uc) => ({
          id: uc.centerId,
          name: uc.center?.name || 'Unknown Center',
          accessType: 'user' as const,
          isActive: uc.isActive,
        })),
        ...adminCenterAccess.map((aca) => ({
          id: aca.centerId,
          name: aca.center?.name || 'Unknown Center',
          accessType: 'admin' as const,
          isActive: true,
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
        ...user,
        ...user.profile,
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
}
