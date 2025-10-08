import { ConflictException, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundException,
  InsufficientPermissionsException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserRoleRepository } from '@/modules/access-control/repositories/user-role.repository';
import { ProfileService } from './profile.service';
import { LoggerService } from '@/shared/services/logger.service';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import {
  UserListQuery,
  GetProfileParams,
  ChangePasswordParams,
  GetCurrentUserProfileParams,
  UserServiceResponse,
  CurrentUserProfileResponse,
} from '../interfaces/user-service.interface';
import { User } from '../entities/user.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { CentersService } from '@/modules/centers/services/centers.service';
import { UserRole } from '@/modules/access-control/entities';
import { PaginateUsersDto } from '../dto/paginate-users.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateAdminsDto } from '../dto/paginate-admins.dto';

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

    // Check center access if centerId is provided
    if (centerId) {
      const hasCenterAccess =
        await this.accessControlHelperService.canCenterAccess({
          userId: currentUserId || userId,
          centerId,
        });
      if (!hasCenterAccess) {
        throw new InsufficientPermissionsException(
          'Access denied to this center',
        );
      }
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
   * Handle user role assignment (one role per scope)
   */
  async handleUserRoleAssignment(
    userId: string,
    dto: CreateUserRequestDto,
    currentUserId: string,
  ): Promise<void> {
    const currentUserRole =
      await this.accessControlHelperService.getUserRole(currentUserId);
    const currentUserRoleType = currentUserRole?.role?.type;

    // Assign single role (centerId in role = center access)
    if (dto.userRole?.roleId) {
      await this.rolesService.assignRole({
        userId,
        roleId: dto.userRole.roleId,
        centerId: dto.userRole.centerId || undefined,
      });

      // Grant access to the creator if currentUserId is provided and centerId exists
      if (
        currentUserId !== userId &&
        ((currentUserRoleType === RoleType.ADMIN && !dto.userRole.centerId) ||
          currentUserRoleType === RoleType.CENTER)
      ) {
        try {
          await this.accessControlService.grantUserAccess({
            userId: currentUserId,
            granterUserId: currentUserId,
            targetUserId: userId,
            centerId: dto.userRole.centerId,
          });
          this.logger.info(
            `User access granted from ${currentUserId} to ${userId} for center ${dto.userRole.centerId}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to grant user access for center ${dto.userRole.centerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }
  }

  async paginateUsers(params: PaginateUsersDto, actorUser: ActorUser) {
    const { centerId } = params;
    await this.accessControlHelperService.validateAdminAndCenterAccess({
      userId: actorUser.id,
      centerId,
    });

    params.centerId = params.centerId ?? actorUser.centerId;

    const result = await this.userRepository.paginateUsers(
      params,
      actorUser.id,
    );

    return result;
  }

  async paginateAdmins(params: PaginateAdminsDto, actorUser: ActorUser) {
    return this.userRepository.paginateAdmins(params, actorUser.id);
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
    await this.deleteUserWithCascade();

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

  private async deleteUserWithCascade(): Promise<void> {
    // // 1. Delete user roles - this would need to be implemented in RolesService
    // // For now, we'll skip this step as it requires getting all user roles first
    // // await this.rolesService.removeAllUserRoles(userId);
    // // 2. Delete user access grants (UserAccess - where user is granter)
    // await this.accessControlService.revokeUserAccessValidate({
    //   userId: userId,
    //   granterUserId: userId,
    //   targetUserId: userId,
    // });
    // // 3. Delete user roles (which automatically removes center access)
    // // Roles will be automatically removed through cascade deletion or we can remove them explicitly
    // await this.userRoleRepository.removeUserRole(userId);
    // // 4. Delete user profile
    // const profile = await this.profileService.findProfileByUserId(userId);
    // if (profile) {
    //   await this.profileService.deleteUserProfile(userId);
    // }
    // // 5. Soft delete the user
    // await this.userRepository.softRemove(userId);
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
      const user = await this.userRepository.findOne(userId);
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

      const hasAdminRole =
        await this.accessControlHelperService.hasAdminRole(userId);
      returnData.isAdmin = hasAdminRole;

      if (centerId) {
        const center = await this.centersService.findCenterById(centerId);
        if (center) {
          returnData.context.center = center;
          const contextRoles = await this.rolesService.findUserRole(
            userId,
            centerId,
          );
          returnData.context.role = contextRoles as UserRole;
        }
      }
      if (!returnData.context.role) {
        const userGlobalRole =
          await this.accessControlHelperService.getUserRole(userId);
        returnData.context.role = userGlobalRole as UserRole;
      }

      this.logger.log(`Returning profile for user: ${userId}`);

      return returnData;
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
