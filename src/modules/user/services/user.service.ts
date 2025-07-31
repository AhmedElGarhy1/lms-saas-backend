import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PaginateQuery } from 'nestjs-paginate';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { ProfileService } from './profile.service';
import { UserEventEmitter } from '@/common/events/user.events';
import { LoggerService } from '@/shared/services/logger.service';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { User } from '../entities/user.entity';
import { UserAccess } from '../entities/user-access.entity';
import { UserOnCenter } from '@/modules/access-control/entities/user-on-center.entity';
import { UserAlreadyExistsException } from '../exceptions/user-already-exists.exception';
import { ScopeEnum } from '@/common/constants/role-scope.enum';

// Interface for advanced filtering options
interface ListUsersOptions {
  query: PaginateQuery;
  currentUserId: string;
  scope?: ScopeEnum;
  centerId?: string;
  roleType?: string;
  includeAccess?: boolean;
  includeCenters?: boolean;
  includePermissions?: boolean;
  includeUserAccess?: boolean;
  targetUserId?: string;
  userId?: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
    private readonly rolesService: RolesService,
    private readonly profileService: ProfileService,
    private readonly userEventEmitter: UserEventEmitter,
    private readonly logger: LoggerService,
  ) {}

  async getProfile(userId: string, centerId?: string, currentUserId?: string) {
    // Check if current user can access the target user
    if (currentUserId && currentUserId !== userId) {
      await this.accessControlService.canAccessUserThrowError(
        currentUserId,
        userId,
      );
    }

    const user = await this.userRepository.findUserWithCenters(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Filter centers based on access if centerId is provided
    if (centerId) {
      const canAccessCenter = await this.accessControlService.canAccessCenter(
        currentUserId || userId,
        centerId,
      );

      if (!canAccessCenter) {
        throw new ForbiddenException('Access denied to this center');
      }

      // Filter to only show the specific center
      user.centers = user.centers.filter(
        (center) => center.centerId === centerId,
      );
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findUserForProfile(userId);
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      throw new NotFoundException('User profile not found');
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
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // Update password
    await this.userRepository.update(userId, { password: hashedPassword });

    this.logger.log(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully' };
  }

  async createUser(dto: CreateUserRequestDto): Promise<User> {
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

    // Create profile
    await this.profileService.createUserProfile(savedUser.id, {});

    this.logger.info(`User created: ${savedUser.email}`);

    return savedUser;
  }

  async listUsers(options: ListUsersOptions) {
    const {
      query,
      currentUserId,
      includeCenters = false,
      includePermissions = false,
      includeAccess = false,
      includeUserAccess = false,
    } = options;

    // Get accessible user IDs for the current user
    const accessibleUserIds =
      await this.accessControlService.getAccessibleUserIds(currentUserId);

    // Build base where clause
    const baseWhere: Record<string, any> = {};
    if (accessibleUserIds.length > 0) {
      baseWhere.id = { in: accessibleUserIds };
    }

    // Use the repository's pagination method with enhanced options
    const result = await this.userRepository.paginateUsers(query, {
      includeCenters,
      includePermissions,
      includeUserAccess: includeAccess,
      where: baseWhere,
    });

    // Enhance data with additional information if requested
    if (includeCenters || includePermissions || includeUserAccess) {
      const enhancedData = await Promise.all(
        result.data.map(async (user: User) => {
          const enhancedUser: User & {
            userAccess?: UserAccess[];
            userCenters?: UserOnCenter[];
            userPermissions?: string[];
            grantedAccess?: UserAccess[];
          } = { ...user } as any;

          // Include user access relationships
          if (includeAccess) {
            const userAccess = await this.accessControlService.listUserAccesses(
              user.id,
            );
            enhancedUser.userAccess = userAccess;
          }

          // Include user centers
          if (includeCenters) {
            const userCenters = await this.accessControlService.getUserCenters(
              user.id,
            );
            enhancedUser.userCenters = userCenters;
          }

          // Include user permissions
          if (includePermissions) {
            const permissions =
              await this.accessControlService.getUserPermissionsFromRoles(
                user.id,
                { scope: ScopeEnum.ADMIN },
              );
            (enhancedUser as any).userPermissions = permissions;
          }

          // Include user access relationships (granted by this user)
          if (includeUserAccess) {
            const grantedAccess =
              await this.accessControlService.listUserAccesses(user.id);
            enhancedUser.grantedAccess = grantedAccess;
          }

          return enhancedUser;
        }),
      );

      return {
        ...result,
        data: enhancedData,
      };
    }

    return result;
  }

  async getAccessibleUsers(query: PaginateQuery, currentUserId: string) {
    // Get users that the current user has access to via UserAccess
    const accessibleUserIds =
      await this.accessControlService.getAccessibleUserIds(currentUserId);

    if (accessibleUserIds.length === 0) {
      return this.userRepository.paginateUsers(query);
    }

    // Build where clause
    const whereClause: { id: { in: string[] } } = {
      id: { in: accessibleUserIds },
    };

    // Use the new consolidated paginateUsers method
    const users = await this.userRepository.paginateUsers(query, {
      where: whereClause,
    });

    // Transform the data to remove sensitive information
    const transformedData = users.data.map((user: User) => {
      const { password, twoFactorSecret, ...userData } = user;
      return userData;
    });

    return {
      data: transformedData,
      meta: users.meta,
    };
  }

  async deleteUser(userId: string, currentUserId: string): Promise<void> {
    // Check if current user can delete the target user
    if (currentUserId !== userId) {
      await this.accessControlService.canAccessUserThrowError(
        currentUserId,
        userId,
      );
    }

    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user with cascade
    await this.deleteUserWithCascade(userId);

    this.logger.log(`User deleted: ${userId} by ${currentUserId}`);
  }

  async restoreUser(userId: string, currentUserId: string): Promise<void> {
    // Check if current user can restore the target user
    await this.accessControlService.canAccessUserThrowError(
      currentUserId,
      userId,
    );

    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
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
      targetUserId: userId,
    });

    // 3. Delete user center memberships (UserOnCenter)
    const userCentersResult =
      await this.accessControlService.getUserCenters(userId);
    const userCenters = (userCentersResult as UserOnCenter[]).map(
      (center: UserOnCenter) => ({
        centerId: center.centerId || center.id,
      }),
    );

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
    // Check if current user can activate/deactivate the target user
    await this.accessControlService.canAccessUserThrowError(
      currentUserId,
      userId,
    );

    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
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

  async getUserActivationStatus(userId: string): Promise<{
    global: { isActive: boolean };
    centers: Array<{
      centerId: string;
      centerName: string;
      isActive: boolean;
    }>;
  }> {
    const user = await this.userRepository.findUserWithCenters(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      global: { isActive: user.isActive },
      centers: user.centers.map((center) => ({
        centerId: center.centerId,
        centerName: center.center?.name || 'Unknown Center',
        isActive: center.isActive,
      })),
    };
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
}
