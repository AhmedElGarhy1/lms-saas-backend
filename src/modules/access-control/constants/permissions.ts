export enum PermissionScope {
  ADMIN = 'ADMIN',
  CENTER = 'CENTER',
  BOTH = 'BOTH',
}

// Permission constants for type safety and autocompletion

export const PERMISSIONS = {
  // ===== STAFF MANAGEMENT PERMISSIONS =====
  STAFF: {
    READ: {
      action: 'staff:read',
      name: 'Read Staff',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'staff:create',
      name: 'Create Staff',
      scope: PermissionScope.CENTER,
    },
    GRANT_USER_ACCESS: {
      action: 'staff:grant-user-access',
      name: 'Grant User Access',
      scope: PermissionScope.CENTER,
    },
    GRANT_BRANCH_ACCESS: {
      action: 'staff:grant-branch-access',
      name: 'Grant Branch Access',
      scope: PermissionScope.CENTER,
    },
    GRANT_CENTER_ACCESS: {
      action: 'staff:grant-center-access',
      name: 'Grant Center Access',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'staff:read-all',
      name: 'Read All Staff without Staff Access', // TODO: to implement
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'staff:import',
      name: 'Import Staff',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'staff:export',
      name: 'Export Staff',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== ADMIN MANAGEMENT PERMISSIONS =====
  ADMIN: {
    READ: {
      action: 'admin:read',
      name: 'Read Admin',
      scope: PermissionScope.ADMIN,
    },
    CREATE: {
      action: 'admin:create',
      name: 'Create Admin',
      scope: PermissionScope.ADMIN,
    },
    GRANT_ADMIN_ACCESS: {
      action: 'admin:grant-admin-access',
      name: 'Grant Admin Access',
      scope: PermissionScope.ADMIN,
    },
    GRANT_CENTER_ACCESS: {
      action: 'admin:grant-center-access',
      name: 'Grant Center Access',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'admin:read-all',
      name: 'Read All Admin without Admin Access', // TODO: to implement
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'admin:import',
      name: 'Import Admin',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'admin:export',
      name: 'Export Admin',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== CENTER MANAGEMENT PERMISSIONS =====
  CENTER: {
    CREATE: {
      action: 'center:create',
      name: 'Create Centers',
      scope: PermissionScope.ADMIN,
    },
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
    ACTIVATE: {
      action: 'center:activate',
      name: 'Activate/Deactivate Centers',
      scope: PermissionScope.ADMIN,
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

  // ===== BRANCH MANAGEMENT PERMISSIONS =====
  BRANCHES: {
    CREATE: {
      action: 'branches:create',
      name: 'Create Branches',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'branches:update',
      name: 'Update Branches',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'branches:delete',
      name: 'Delete Branches',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'branches:restore',
      name: 'Restore Branches',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE: {
      action: 'branches:activate',
      name: 'Activate/Deactivate Branches',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'branches:import',
      name: 'Import Branches',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'branches:export',
      name: 'Export Branches',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'branches:read-all',
      name: 'Read All Branches without Branch Access', // TODO: to implement
      scope: PermissionScope.CENTER,
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
