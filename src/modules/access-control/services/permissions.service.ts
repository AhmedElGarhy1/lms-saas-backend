import { Injectable } from '@nestjs/common';
import {
  getPermissionsByType,
  isAdminPermission,
  isUserPermission,
  ROLE_TYPES,
  ROLE_SCOPES,
  DEFAULT_ROLE_PERMISSIONS,
  getDefaultPermissionsForRoleType,
  getAllPermissionActions,
  getPermissionCategories,
  isValidPermission,
  getPermissionAction,
} from '../constants/permissions.config';

@Injectable()
export class PermissionsService {
  /**
   * Get all available permission actions
   */
  getAllPermissions(): string[] {
    return getAllPermissionActions();
  }

  /**
   * Get default permissions for a specific role type
   */
  getDefaultPermissionsForRoleType(
    roleType: keyof typeof ROLE_TYPES,
  ): string[] {
    return getDefaultPermissionsForRoleType(roleType);
  }

  /**
   * Get all permission categories
   */
  getPermissionCategories(): Record<string, string[]> {
    return getPermissionCategories();
  }

  /**
   * Check if a user has a specific permission based on their roles
   */
  hasPermission(
    userRoles: Array<{ role: { permissions: string[] } }>,
    requiredPermission: string,
  ): boolean {
    // Check role-based permissions
    for (const userRole of userRoles) {
      if (
        userRole.role.permissions &&
        userRole.role.permissions.includes(requiredPermission)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all permissions for a user based on their roles
   */
  getUserPermissions(
    userRoles: Array<{ role: { permissions: string[] } }>,
  ): string[] {
    const allPermissions = new Set<string>();

    // Add role-based permissions
    userRoles.forEach((userRole) => {
      if (userRole.role.permissions) {
        userRole.role.permissions.forEach((permission) =>
          allPermissions.add(permission),
        );
      }
    });

    return Array.from(allPermissions);
  }

  /**
   * Validate if a permission action exists
   */
  isValidPermission(permission: string): boolean {
    return isValidPermission(permission);
  }

  /**
   * Get permission action by category and action name
   */
  getPermissionAction(category: string, action: string): string | null {
    return getPermissionAction(category, action);
  }

  /**
   * Get role type definitions
   */
  getRoleTypes(): typeof ROLE_TYPES {
    return ROLE_TYPES;
  }

  /**
   * Get role scope definitions
   */
  getRoleScopes(): typeof ROLE_SCOPES {
    return ROLE_SCOPES;
  }

  /**
   * Get default permissions for all role types
   */
  getDefaultRolePermissions(): typeof DEFAULT_ROLE_PERMISSIONS {
    return DEFAULT_ROLE_PERMISSIONS;
  }

  /**
   * Create a new role with default permissions for a role type
   */
  createRoleWithDefaultPermissions(
    name: string,
    roleType: keyof typeof ROLE_TYPES,
    scope: keyof typeof ROLE_SCOPES,
    description?: string,
  ) {
    const defaultPermissions = this.getDefaultPermissionsForRoleType(roleType);

    return {
      name,
      type: roleType,
      scope,
      description,
      permissions: defaultPermissions,
      isActive: true,
    };
  }

  /**
   * Validate role permissions
   */
  validateRolePermissions(permissions: string[]): {
    valid: boolean;
    invalid: string[];
  } {
    const invalidPermissions: string[] = [];

    permissions.forEach((permission) => {
      if (!this.isValidPermission(permission)) {
        invalidPermissions.push(permission);
      }
    });

    return {
      valid: invalidPermissions.length === 0,
      invalid: invalidPermissions,
    };
  }

  /**
   * Get permissions by category
   */
  getPermissionsByCategory(category: string): string[] {
    const categories = getPermissionCategories();
    return categories[category] || [];
  }

  /**
   * Get all permission categories as array
   */
  getPermissionCategoryNames(): string[] {
    const categories = getPermissionCategories();
    return Object.keys(categories);
  }

  /**
   * Get permissions by type (admin, user)
   */
  getPermissionsByType(type: 'admin' | 'user'): string[] {
    const permissions = getPermissionsByType(type);
    return permissions.map((p) => p.action);
  }

  /**
   * Check if a permission is an admin permission
   */
  isAdminPermission(permission: string): boolean {
    return isAdminPermission(permission);
  }

  /**
   * Check if a permission is a user permission
   */
  isUserPermission(permission: string): boolean {
    return isUserPermission(permission);
  }
}
