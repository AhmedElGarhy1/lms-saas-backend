import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AccessControlRepository } from '../repositories/access-control.repository';
import { PermissionService } from './permission.service';
import { PaginateQuery } from 'nestjs-paginate';
import { AdminCenterAccess } from '../entities/admin/admin-center-access.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { ScopeEnum } from '@/common/constants/role-scope.enum';
import { UserOnCenter } from '../entities/user-on-center.entity';
import { Center } from '../entities/center.entity';
import { User } from '@/modules/user/entities/user.entity';
import { LoggerService } from '@/shared/services/logger.service';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    private readonly accessControlRepository: AccessControlRepository,
    private readonly permissionService: PermissionService,
  ) {}

  async userHasRoleType(userId: string, roleType: string, centerId?: string) {
    return this.accessControlRepository.userHasRoleType(userId, roleType);
  }

  async getUserPermissions(userId: string, centerId?: string) {
    // Use PermissionService which handles caching and DB fetching
    const result = await this.permissionService.getUserPermissions(userId, centerId);
    return result.permissions; // Return just the permissions array
  }

  async getUserPermissionsFromRoles(
    userId: string,
    context?: { centerId?: string; scope?: ScopeEnum },
  ) {
    // Use PermissionService which handles context-aware permissions from roles
    return this.permissionService.getUserPermissionsFromRoles(userId, context);
  }

  async canAccessUser(userId: string, targetId: string): Promise<boolean> {
    try {
      // Users can always access themselves
      if (userId === targetId) {
        return true;
      }

      // Check if user has explicit access to target user via UserAccess
      const userAccess = await this.accessControlRepository.findUserAccess(
        userId,
        targetId,
      );

      return !!userAccess;
    } catch (error) {
      this.logger.error(`Error checking user access: ${error.message}`);
      return false;
    }
  }

  async canAccessCenter(userId: string, centerId: string): Promise<boolean> {
    try {
      // Check if user has explicit access to center via CenterAccess
      const centerAccess = await this.accessControlRepository.findCenterAccess(
        userId,
        centerId,
      );

      return !!centerAccess;
    } catch (error) {
      this.logger.error(`Error checking center access: ${error.message}`);
      return false;
    }
  }

  async grantUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
  }): Promise<void> {
    await this.accessControlRepository.grantUserAccess(body);
  }

  async revokeUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
  }): Promise<void> {
    await this.accessControlRepository.revokeUserAccess(body);
  }

  async grantCenterAccess(
    userId: string,
    centerId: string,
    grantedBy: string,
  ): Promise<void> {
    await this.accessControlRepository.grantCenterAccess(userId, centerId);
  }

  async revokeCenterAccess(userId: string, centerId: string): Promise<void> {
    await this.accessControlRepository.revokeCenterAccess(userId, centerId);
  }

  async grantAdminCenterAccess(body: {
    adminId: string;
    centerId: string;
    grantedBy: string;
  }): Promise<void> {
    await this.accessControlRepository.grantAdminCenterAccess(body);
  }

  async revokeAdminCenterAccess(body: {
    adminId: string;
    centerId: string;
  }): Promise<void> {
    await this.accessControlRepository.revokeAdminCenterAccess(body);
  }

  async updateUserCenterActivation(
    userId: string,
    centerId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.accessControlRepository.updateUserCenterActivation(
      userId,
      centerId,
      isActive,
    );
  }

  // Additional methods needed by other services
  async checkCenterAccess(userId: string, centerId: string): Promise<boolean> {
    return this.canAccessCenter(userId, centerId);
  }

  async addUserToCenter(data: {
    userId: string;
    centerId: string;
  }): Promise<void> {
    await this.grantCenterAccess(data.userId, data.centerId, 'system');
  }

  async removeUserFromCenter(data: {
    userId: string;
    centerId: string;
  }): Promise<void> {
    await this.revokeCenterAccess(data.userId, data.centerId);
  }

  async getAdminCenterAccess(adminId: string): Promise<AdminCenterAccess[]> {
    return this.accessControlRepository.getAdminCenterAccess(adminId);
  }

  async getAdminCenterIds(adminId: string): Promise<string[]> {
    const adminAccess =
      await this.accessControlRepository.getAdminCenterAccess(adminId);
    // Since AdminCenterAccess doesn't have centerId, we need to get it from a different source
    // For now, return empty array as this needs to be implemented properly
    return [];
  }

  async getUserCenters(userId: string): Promise<any[]> {
    return this.accessControlRepository.getUserCenters(userId);
  }

  async listUserAccesses(userId: string): Promise<UserAccess[]> {
    return this.accessControlRepository.listUserAccesses(userId);
  }

  async getAccessibleUserIds(userId: string): Promise<string[]> {
    const userAccesses =
      await this.accessControlRepository.listUserAccesses(userId);
    return userAccesses.map((access: UserAccess) => access.targetUserId);
  }

  async getCenterUserIds(centerId: string): Promise<string[]> {
    const centerUsers =
      await this.accessControlRepository.getCenterUsers(centerId);
    return centerUsers.map((user: { userId: string }) => user.userId);
  }

  async canAccessUserThrowError(
    userId: string,
    targetId: string,
  ): Promise<void> {
    const canAccess = await this.canAccessUser(userId, targetId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this user');
    }
  }

  // Permission-related methods using PermissionService
  async userHasPermission(
    userId: string,
    permissionAction: string,
    centerId?: string,
  ): Promise<boolean> {
    return this.permissionService.userHasPermission(
      userId,
      permissionAction,
      centerId,
    );
  }

  async assignUserPermission(data: {
    userId: string;
    permissionId: string;
    centerId?: string;
  }) {
    return this.permissionService.assignUserPermission(data);
  }

  async removeUserPermission(data: {
    userId: string;
    permissionId: string;
    centerId?: string;
  }) {
    return this.permissionService.removeUserPermission(data);
  }

  async getAllPermissions() {
    return this.permissionService.getAllPermissions();
  }

  async getAdminPermissions(query?: PaginateQuery) {
    return this.permissionService.getAdminPermissions();
  }

  async paginatePermissions(
    query: PaginateQuery,
    filter?: 'all' | 'admin-only',
  ) {
    return this.permissionService.paginatePermissions(query, filter);
  }

  async checkUserAccess(
    userId: string,
    targetUserId: string,
  ): Promise<boolean> {
    return this.canAccessUser(userId, targetUserId);
  }

  async needsPermissionCheck(
    userId: string,
    centerId?: string,
  ): Promise<boolean> {
    // This method should determine if a user needs permission checking
    // For now, return true for all users
    return true;
  }

  async getUserRoles(userId: string): Promise<any[]> {
    // This method should return user roles
    // For now, return empty array until we implement the full role system
    return [];
  }
}
