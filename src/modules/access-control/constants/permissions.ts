export enum PermissionScope {
  ADMIN = 'ADMIN',
  CENTER = 'CENTER',
  BOTH = 'BOTH',
}

// Permission constants for type safety and autocompletion

export const PERMISSIONS = {
  USER: {
    CREATE: {
      action: 'user:create',
      name: 'Create Users',
      scope: PermissionScope.BOTH,
    },
    READ: {
      action: 'user:read',
      name: 'Read Users',
      scope: PermissionScope.BOTH,
    },
    UPDATE: {
      action: 'user:update',
      name: 'Update Users',
      scope: PermissionScope.BOTH,
    },
    DELETE: {
      action: 'user:delete',
      name: 'Delete Users',
      scope: PermissionScope.BOTH,
    },
    RESTORE: {
      action: 'user:restore',
      name: 'Restore Users',
      scope: PermissionScope.BOTH,
    },
    GRANT_ACCESS: {
      action: 'user:grant-user-access',
      name: 'Grant User Access',
      scope: PermissionScope.BOTH,
    },
    REVOKE_ACCESS: {
      action: 'user:revoke-user-access',
      name: 'Revoke User Access',
      scope: PermissionScope.BOTH,
    },
    READ_ALL: {
      action: 'user:read-all',
      name: 'Read All Users without User Access', // TODO: to implement
      scope: PermissionScope.BOTH,
    },
    IMPORT: {
      action: 'user:import',
      name: 'Import Users',
      scope: PermissionScope.BOTH,
    },
    EXPORT: {
      action: 'user:export',
      name: 'Export Users',
      scope: PermissionScope.BOTH,
    },
  },

  // ===== CENTER MANAGEMENT PERMISSIONS =====
  CENTER: {
    CREATE: {
      action: 'center:create',
      name: 'Create Centers',
      scope: PermissionScope.ADMIN,
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
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'center:delete',
      name: 'Delete Centers',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'center:restore',
      name: 'Restore Centers',
      scope: PermissionScope.ADMIN,
    },
    GRANT_ACCESS: {
      action: 'center:grant-access',
      name: 'Grant Center Access',
      scope: PermissionScope.BOTH,
    },
    REVOKE_ACCESS: {
      action: 'center:revoke-access',
      name: 'Revoke Center Access',
      scope: PermissionScope.BOTH,
    },
    READ_ALL: {
      action: 'center:read-all',
      name: 'Read All Centers without Center Access', // TODO: to implement
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'center:import',
      name: 'Import Centers',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'center:export',
      name: 'Export Centers',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ROLE MANAGEMENT PERMISSIONS =====
  ROLES: {
    VIEW: {
      action: 'roles:view',
      name: 'View Roles',
      scope: PermissionScope.BOTH,
    },
    CREATE: {
      action: 'roles:create',
      name: 'Create Role',
      scope: PermissionScope.BOTH,
    },
    UPDATE: {
      action: 'roles:update',
      name: 'Update Role',
      scope: PermissionScope.BOTH,
    },
    DELETE: {
      action: 'roles:delete',
      name: 'Delete Role',
      scope: PermissionScope.BOTH,
    },
    RESTORE: {
      action: 'roles:restore',
      name: 'Restore Role',
      scope: PermissionScope.BOTH,
    },
    ASSIGN: {
      action: 'roles:assign',
      name: 'Assign Role',
      scope: PermissionScope.BOTH,
    },
    REMOVE: {
      action: 'roles:remove',
      name: 'Remove Role',
      scope: PermissionScope.BOTH,
    },
    IMPORT: {
      action: 'roles:import',
      name: 'Import Roles',
      scope: PermissionScope.BOTH,
    },
    EXPORT: {
      action: 'roles:export',
      name: 'Export Roles',
      scope: PermissionScope.BOTH,
    },
  },

  // ===== ACTIVITY LOG PERMISSIONS =====
  ACTIVITY_LOG: {
    VIEW: {
      action: 'activity-log:view',
      name: 'View Activity Logs',
      scope: PermissionScope.BOTH,
    },
    EXPORT: {
      action: 'activity-log:export',
      name: 'Export Activity Logs',
      scope: PermissionScope.BOTH,
    },
  },

  // ===== SYSTEM PERMISSIONS =====
  SYSTEM: {
    HEALTH_CHECK: {
      action: 'system:health-check',
      name: 'System Health Check',
      scope: PermissionScope.ADMIN,
    },
  },
} as const;

export type PermissionsObject = typeof PERMISSIONS;
export type PermissionObject = PermissionsObject[keyof PermissionsObject];
export interface IPermission {
  action: string;
  name: string;
  scope: PermissionScope;
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
  (permission) => permission.scope === PermissionScope.ADMIN,
);

// User permissions (scope: CENTER or BOTH)
export const USER_PERMISSIONS = ALL_PERMISSIONS.filter(
  (permission) =>
    permission.scope === PermissionScope.CENTER ||
    permission.scope === PermissionScope.BOTH,
);
