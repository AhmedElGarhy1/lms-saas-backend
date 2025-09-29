// Import permissions from access-control module
import {
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  USER_PERMISSIONS,
  isAdminPermission,
  isUserPermission,
} from './permissions';

// Re-export permissions for backward compatibility
export {
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  USER_PERMISSIONS,
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

export const getAllPermissionActions = (): string[] => {
  return ALL_PERMISSIONS.map((p) => p.action);
};
