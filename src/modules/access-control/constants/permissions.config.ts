// Import permissions from access-control module
import {
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  USER_PERMISSIONS,
  getPermissionsByType,
  isAdminPermission,
  isUserPermission,
} from './permissions';

// Re-export permissions for backward compatibility
export {
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  USER_PERMISSIONS,
  getPermissionsByType,
  isAdminPermission,
  isUserPermission,
};

// Role type definitions
export const ROLE_TYPES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CENTER_ADMIN: 'CENTER_ADMIN',
  USER: 'USER',
} as const;

// Scope definitions
export const ROLE_SCOPES = {
  ADMIN: 'ADMIN',
  CENTER: 'CENTER',
} as const;

// Default permissions for each role type (used when creating new roles)
export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLE_TYPES.SUPER_ADMIN]: ALL_PERMISSIONS.map((p) => p.action),
  [ROLE_TYPES.ADMIN]: ADMIN_PERMISSIONS.map((p) => p.action),
  [ROLE_TYPES.CENTER_ADMIN]: ADMIN_PERMISSIONS.map((p) => p.action), // Center admins have admin permissions but center-scoped
  [ROLE_TYPES.USER]: USER_PERMISSIONS.map((p) => p.action),
} as const;

// Helper functions
export const getDefaultPermissionsForRoleType = (
  roleType: keyof typeof ROLE_TYPES,
): string[] => {
  return [...DEFAULT_ROLE_PERMISSIONS[roleType]];
};

export const getAllPermissionActions = (): string[] => {
  return ALL_PERMISSIONS.map((p) => p.action);
};

export const getPermissionCategories = (): Record<string, string[]> => {
  const categories: Record<string, string[]> = {};

  // Group permissions by their prefix (before the first colon)
  ALL_PERMISSIONS.forEach((permission) => {
    const [category] = permission.action.split(':');
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(permission.action);
  });

  return categories;
};

export const isValidPermission = (permission: string): boolean => {
  return ALL_PERMISSIONS.some((p) => p.action === permission);
};

export const getPermissionAction = (
  category: string,
  action: string,
): string | null => {
  const permission = `${category}:${action}`;
  return isValidPermission(permission) ? permission : null;
};
