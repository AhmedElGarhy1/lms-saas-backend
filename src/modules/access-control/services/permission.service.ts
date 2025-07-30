import { Injectable } from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';
import { PermissionCacheService } from './permission-cache.service';
import { Permission } from '../entities/permission.entity';
import { ScopeEnum } from '@/common/constants/role-scope.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { UserRoleRepository } from '../repositories/user-role.repository';

@Injectable()
export class PermissionService {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly permissionCacheService: PermissionCacheService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get all permissions from database
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      return await this.permissionRepository.findAll();
    } catch (error) {
      this.logger.error('Failed to fetch all permissions from database', error);
      throw error;
    }
  }

  /**
   * Get admin permissions from database
   */
  async getAdminPermissions(): Promise<Permission[]> {
    try {
      return await this.permissionRepository.getAdminPermissions();
    } catch (error) {
      this.logger.error(
        'Failed to fetch admin permissions from database',
        error,
      );
      throw error;
    }
  }

  /**
   * Get context-aware user permissions from roles
   * @param userId - The user ID
   * @param context - The current context (centerId, admin scope, etc.)
   * @returns Array of permission actions for the current context
   */
  async getUserPermissionsFromRoles(
    userId: string,
    context?: { centerId?: string; scope?: ScopeEnum },
  ): Promise<string[]> {
    try {
      // Build cache key based on context
      const cacheKey = `${userId}:${context?.centerId || 'admin'}:${
        context?.scope || 'all'
      }`;

      // Try to get from cache first
      const cachedPermissions =
        this.permissionCacheService.getUserPermissions(cacheKey);
      if (cachedPermissions) {
        this.logger.debug(
          `Returning cached context permissions for user: ${userId}`,
        );
        return cachedPermissions;
      }

      // Cache miss - fetch from database
      this.logger.debug(
        `Cache miss, fetching context permissions from roles for user: ${userId}`,
      );

      // Get user roles based on context
      let userRoles;
      if (context?.centerId) {
        // Get roles for specific center
        userRoles = await this.userRoleRepository.findUserRolesForCenter(
          userId,
          context.centerId,
        );
      } else if (context?.scope === ScopeEnum.ADMIN) {
        // Get admin roles
        userRoles = await this.userRoleRepository.findUserRolesByScope(
          userId,
          ScopeEnum.ADMIN,
        );
      } else {
        // Get all user roles
        userRoles = await this.userRoleRepository.findUserRolesByUserId(userId);
      }

      // Extract permissions from roles
      const permissions = new Set<string>();
      for (const userRole of userRoles) {
        if (userRole.role?.permissions) {
          userRole.role.permissions.forEach((permission: string) => {
            permissions.add(permission);
          });
        }
      }

      const permissionsArray = Array.from(permissions);

      // Cache the result
      this.permissionCacheService.setUserPermissions(
        cacheKey,
        permissionsArray,
      );

      this.logger.debug(
        `Fetched and cached context permissions for user: ${userId}`,
        undefined,
        {
          permissionsCount: permissionsArray.length,
          context,
        },
      );

      return permissionsArray;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch context permissions from roles for user: ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  /**
   * Get user permissions from database with caching (legacy method)
   */
  async getUserPermissions(
    userId: string,
    centerId?: string,
  ): Promise<{ permissions: string[]; roles: string[] }> {
    // Try to get from cache first
    const cachedPermissions =
      this.permissionCacheService.getUserPermissions(userId);

    if (cachedPermissions) {
      this.logger.debug(`Returning cached permissions for user: ${userId}`);
      return {
        permissions: cachedPermissions,
        roles: [],
      };
    }

    // Cache miss - fetch from database
    this.logger.debug(
      `Cache miss, fetching permissions from DB for user: ${userId}`,
    );

    // This method is no longer used for fetching permissions, but keeping it for now
    // as it might be used elsewhere or for historical context.
    // The actual permission fetching is now handled by getUserPermissionsFromRoles.
    const userPermissions: string[] = []; // No longer fetching UserPermission entities
    const roles: string[] = []; // Roles would need to be fetched separately

    const result = {
      permissions: userPermissions,
      roles,
    };

    // Cache the result
    this.permissionCacheService.setUserPermissions(userId, userPermissions);

    this.logger.debug(
      `Fetched and cached permissions for user: ${userId}`,
      undefined,
      {
        permissionsCount: userPermissions.length,
        centerId,
      },
    );

    return result;
  }

  /**
   * Create a new permission
   */
  async createPermission(data: {
    action: string;
    description?: string;
    isAdmin?: boolean;
  }): Promise<Permission> {
    try {
      return await this.permissionRepository.createPermission(data);
    } catch (error) {
      this.logger.error('Failed to create permission', error);
      throw error;
    }
  }

  /**
   * Assign permission to user (deprecated - use roles instead)
   */
  async assignUserPermission(data: {
    userId: string;
    permissionId: string;
    centerId?: string;
  }): Promise<void> {
    try {
      // This method is no longer used for assigning permissions,
      // as permissions are now managed by roles.
      // Keeping it for now as it might be used elsewhere or for historical context.
      this.logger.warn(
        `assignUserPermission method is deprecated. Permissions are now managed by roles.`,
      );
      // If you need to manage user permissions, you would do it via UserRoleRepository.
      // For now, we'll just log a warning.
    } catch (error) {
      this.logger.error(
        `Failed to assign permission to user: ${data.userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove permission from user (deprecated - use roles instead)
   */
  async removeUserPermission(data: {
    userId: string;
    permissionId: string;
    centerId?: string;
  }): Promise<void> {
    try {
      // This method is no longer used for removing permissions,
      // as permissions are now managed by roles.
      // Keeping it for now as it might be used elsewhere or for historical context.
      this.logger.warn(
        `removeUserPermission method is deprecated. Permissions are now managed by roles.`,
      );
      // If you need to manage user permissions, you would do it via UserRoleRepository.
      // For now, we'll just log a warning.
    } catch (error) {
      this.logger.error(
        `Failed to remove permission from user: ${data.userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Paginate permissions
   */
  async paginatePermissions(
    query: PaginateQuery,
    filter?: 'all' | 'admin-only',
  ): Promise<Paginated<Permission>> {
    return this.permissionRepository.paginatePermissions(query, filter);
  }

  /**
   * Check if user has specific permission
   */
  async userHasPermission(
    userId: string,
    permissionAction: string,
    centerId?: string,
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissionsFromRoles(userId, {
        centerId,
        scope: undefined, // No specific scope means all permissions
      });
      return userPermissions.includes(permissionAction);
    } catch (error) {
      this.logger.error(
        `Failed to check user permission: ${permissionAction}`,
        error,
      );
      return false;
    }
  }

  /**
   * Get permission by ID from database
   */
  async getPermissionById(permissionId: string): Promise<Permission | null> {
    try {
      return await this.permissionRepository.findById(permissionId);
    } catch (error) {
      this.logger.error(
        `Failed to fetch permission by ID: ${permissionId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get permission by action from database
   */
  async getPermissionByAction(action: string): Promise<Permission | null> {
    try {
      const permissions = await this.permissionRepository.findWithOptions({
        where: { action },
      });
      return permissions.length > 0 ? permissions[0] : null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch permission by action: ${action}`,
        error,
      );
      throw error;
    }
  }
}
