import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { AccessControlRepository } from '../repositories/access-control.repository';
import { PermissionService } from './permission.service';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { ScopeEnum } from '@/shared/common/constants/role-scope.enum';
import { AccessControlHelperService } from './access-control-helper.service';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    private readonly accessControlRepository: AccessControlRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly permissionService: PermissionService,
  ) {}

  async getUserPermissions(userId: string, centerId?: string) {
    // Use PermissionService which handles caching and DB fetching
    const result = await this.permissionService.getUserPermissions(
      userId,
      centerId,
    );
    return result.permissions; // Return just the permissions array
  }

  async getUserPermissionsFromRoles(
    userId: string,
    context?: { centerId?: string; scope?: ScopeEnum },
  ) {
    // Use PermissionService which handles context-aware permissions from roles
    return this.permissionService.getUserPermissionsFromRoles(userId, context);
  }

  async grantUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    await this.accessControlRepository.grantUserAccess(body);
  }

  async revokeUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    await this.accessControlRepository.revokeUserAccess(body);
  }

  async grantUserAccessValidate(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    // Check user already have access
    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: body.userId,
        targetUserId: body.granterUserId,
        centerId: body.centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new ForbiddenException('You do not have access to granter user');
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: body.userId,
        targetUserId: body.targetUserId,
        centerId: body.centerId,
      });

    if (!IHaveAccessToTargetUser) {
      throw new ForbiddenException('You do not have access to target user');
    }

    if (body.centerId) {
      await this.accessControlHelperService.validateCenterAccess({
        userId: body.userId,
        centerId: body.centerId,
      });
    }

    // Check if access already exists
    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserId: body.granterUserId,
      targetUserId: body.targetUserId,
      centerId: body.centerId,
    });

    if (canAccess) {
      throw new ForbiddenException('User already has access');
    }

    await this.grantUserAccess(body);
  }

  async revokeUserAccessValidate(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    // Check user already have access
    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: body.userId,
        targetUserId: body.granterUserId,
        centerId: body.centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new ForbiddenException('You do not have access to granter user');
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: body.userId,
        targetUserId: body.targetUserId,
        centerId: body.centerId,
      });

    if (!IHaveAccessToTargetUser) {
      throw new ForbiddenException('You do not have access to target user');
    }

    if (body.centerId) {
      const IHaveAccessToCenter =
        await this.accessControlHelperService.canCenterAccess({
          userId: body.userId,
          centerId: body.centerId,
        });

      if (!IHaveAccessToCenter) {
        throw new ForbiddenException('You do not have access to center');
      }
    }

    // Check if access exists
    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserId: body.granterUserId,
      targetUserId: body.targetUserId,
      centerId: body.centerId,
    });

    if (!canAccess) {
      throw new ForbiddenException('User does not have access');
    }

    await this.revokeUserAccess(body);
  }

  async grantCenterAccessValidate(
    userId: string,
    centerId: string,
    grantedBy: string,
  ): Promise<void> {
    const IHaveAccessToCenter =
      await this.accessControlHelperService.canCenterAccess({
        centerId,
        userId: grantedBy,
      });

    if (!IHaveAccessToCenter) {
      throw new ForbiddenException('You do not have access to center');
    }

    const IHaveAccessToUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: grantedBy,
        targetUserId: userId,
        centerId,
      });

    if (!IHaveAccessToUser) {
      throw new ForbiddenException('You do not have access to user');
    }

    const userHasAccessToCenter =
      await this.accessControlHelperService.canCenterAccess({
        userId,
        centerId,
      });
    if (userHasAccessToCenter) {
      throw new ForbiddenException('User already has access to center');
    }

    await this.accessControlRepository.grantCenterAccess(
      userId,
      centerId,
      grantedBy,
    );
  }

  async revokeCenterAccess(
    currentUserId: string,
    userId: string,
    centerId: string,
  ): Promise<void> {
    const IHaveAccessToCenter =
      await this.accessControlHelperService.canCenterAccess({
        userId,
        centerId,
      });
    if (!IHaveAccessToCenter) {
      throw new ForbiddenException('You do not have access to center');
    }

    const IHaveAccessToUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: currentUserId,
        targetUserId: userId,
        centerId,
      });
    if (!IHaveAccessToUser) {
      throw new ForbiddenException('You do not have access to user');
    }

    const userHasAccessToCenter =
      await this.accessControlHelperService.canCenterAccess({
        userId,
        centerId,
      });
    if (!userHasAccessToCenter) {
      throw new ForbiddenException('User does not have access to center');
    }

    await this.accessControlRepository.revokeCenterAccess(userId, centerId);
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

  // Public method to access permission service for admin permissions
  async getAdminPermissionsPublic() {
    return this.permissionService.getAdminPermissions();
  }

  async paginatePermissions(
    query: PaginationQuery,
    filter?: 'all' | 'admin-only',
  ) {
    return this.permissionService.paginatePermissions(query, filter);
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
