import { ScopeType } from '@/shared/common/decorators/scope.decorator';

// Permission constants for type safety and autocompletion

export const PERMISSIONS = {
  USER: {
    CREATE: {
      action: 'user:create',
      name: 'Create Users',
      scope: ScopeType.BOTH,
    },
    READ: {
      action: 'user:read',
      name: 'Read Users',
      scope: ScopeType.BOTH,
    },
    UPDATE: {
      action: 'user:update',
      name: 'Update Users',
      scope: ScopeType.BOTH,
    },
    DELETE: {
      action: 'user:delete',
      name: 'Delete Users',
      scope: ScopeType.BOTH,
    },
    RESTORE: {
      action: 'user:restore',
      name: 'Restore Users',
      scope: ScopeType.BOTH,
    },
    GRANT_ACCESS: {
      action: 'user:grant-user-access',
      name: 'Grant User Access',
      scope: ScopeType.BOTH,
    },
    REVOKE_ACCESS: {
      action: 'user:revoke-user-access',
      name: 'Revoke User Access',
      scope: ScopeType.BOTH,
    },
  },

  // ===== CENTER MANAGEMENT PERMISSIONS =====
  CENTER: {
    CREATE: {
      action: 'center:create',
      name: 'Create Centers',
      scope: ScopeType.ADMIN,
    },
    // any one can view centers (it's part of his access)
    // VIEW: {
    //   action: 'center:view',
    //   name: 'View Centers',
    //   scope: ScopeType.BOTH,
    // },
    UPDATE: {
      action: 'center:update',
      name: 'Update Centers',
      scope: ScopeType.ADMIN,
    },
    DELETE: {
      action: 'center:delete',
      name: 'Delete Centers',
      scope: ScopeType.ADMIN,
    },
    RESTORE: {
      action: 'center:restore',
      name: 'Restore Centers',
      scope: ScopeType.ADMIN,
    },
    GRANT_ACCESS: {
      action: 'center:grant-access',
      name: 'Grant Center Access',
      scope: ScopeType.BOTH,
    },
    REVOKE_ACCESS: {
      action: 'center:revoke-access',
      name: 'Revoke Center Access',
      scope: ScopeType.BOTH,
    },
  },

  // ===== ROLE MANAGEMENT PERMISSIONS =====
  ROLES: {
    VIEW: {
      action: 'roles:view',
      name: 'View Roles',
      scope: ScopeType.BOTH,
    },
    CREATE: {
      action: 'roles:create',
      name: 'Create Role',
      scope: ScopeType.BOTH,
    },
    UPDATE: {
      action: 'roles:update',
      name: 'Update Role',
      scope: ScopeType.BOTH,
    },
    DELETE: {
      action: 'roles:delete',
      name: 'Delete Role',
      scope: ScopeType.BOTH,
    },
    RESTORE: {
      action: 'roles:restore',
      name: 'Restore Role',
      scope: ScopeType.BOTH,
    },
    ASSIGN: {
      action: 'roles:assign',
      name: 'Assign Role',
      scope: ScopeType.BOTH,
    },
    REMOVE: {
      action: 'roles:remove',
      name: 'Remove Role',
      scope: ScopeType.BOTH,
    },
  },

  // ===== ACTIVITY LOG PERMISSIONS =====
  ACTIVITY_LOG: {
    VIEW: {
      action: 'activity-log:view',
      name: 'View Activity Logs',
      scope: ScopeType.BOTH,
    },
    EXPORT: {
      action: 'activity-log:export',
      name: 'Export Activity Logs',
      scope: ScopeType.BOTH,
    },
  },

  // ===== SYSTEM PERMISSIONS =====
  SYSTEM: {
    HEALTH_CHECK: {
      action: 'system:health-check',
      name: 'System Health Check',
      scope: ScopeType.ADMIN,
    },
  },
} as const;

export type PermissionsObject = typeof PERMISSIONS;
export type PermissionObject = PermissionsObject[keyof PermissionsObject];
export interface IPermission {
  action: string;
  name: string;
  scope: ScopeType;
}

// Helper function to extract all permission objects from the const structure
function extractPermissionObjects(obj: PermissionsObject): IPermission[] {
  const permissions: IPermission[] = [];

  Object.values(obj).forEach((category) => {
    if (category && typeof category === 'object') {
      Object.values(category).forEach((permission) => {
        if (
          permission &&
          typeof permission === 'object' &&
          'action' in permission
        ) {
          permissions.push(permission as unknown as IPermission);
        }
      });
    }
  });

  return permissions;
}

// Flattened permission array for backward compatibility
export const ALL_PERMISSIONS = extractPermissionObjects(PERMISSIONS);

// Admin permissions (scope: ADMIN)
export const ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter(
  (permission) => permission.scope === ScopeType.ADMIN,
);

// User permissions (scope: CENTER or BOTH)
export const USER_PERMISSIONS = ALL_PERMISSIONS.filter(
  (permission) =>
    permission.scope === ScopeType.CENTER ||
    permission.scope === ScopeType.BOTH,
);
