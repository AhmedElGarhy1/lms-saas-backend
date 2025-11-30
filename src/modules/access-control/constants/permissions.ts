export enum PermissionScope {
  ADMIN = 'ADMIN',
  CENTER = 'CENTER',
  BOTH = 'BOTH',
}

// Permission constants for type safety and autocompletion

export const PERMISSIONS = {
  // ===== STAFF MANAGEMENT PERMISSIONS =====
  STAFF: {
    // center scope
    READ: {
      action: 'staff:read',
      name: 't.permissions.staff.read.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'staff:create',
      name: 't.permissions.staff.create.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    GRANT_USER_ACCESS: {
      action: 'staff:grant-user-access',
      name: 't.permissions.staff.grantUserAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    GRANT_BRANCH_ACCESS: {
      action: 'staff:grant-branch-access',
      name: 't.permissions.staff.grantBranchAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'staff:delete-center-access',
      name: 't.permissions.staff.deleteCenterAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'staff:restore-center-access',
      name: 't.permissions.staff.restoreCenterAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'staff:activate-center-access',
      name: 't.permissions.staff.activateCenterAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'staff:read-all',
      name: 't.permissions.staff.readAll.name', // TODO: to implement
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'staff:import',
      name: 't.permissions.staff.import.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'staff:export',
      name: 't.permissions.staff.export.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'staff:import-profile',
      name: 't.permissions.staff.importProfile.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'staff:grant-center-access',
      name: 't.permissions.staff.grantCenterAccess.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'staff:update',
      name: 't.permissions.staff.update.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'staff:delete',
      name: 't.permissions.staff.delete.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'staff:restore',
      name: 't.permissions.staff.restore.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'staff:activate',
      name: 't.permissions.staff.activate.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ADMIN MANAGEMENT PERMISSIONS =====
  ADMIN: {
    READ: {
      action: 'admin:read',
      name: 't.permissions.admin.read.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    CREATE: {
      action: 'admin:create',
      name: 't.permissions.admin.create.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'admin:update',
      name: 't.permissions.admin.update.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'admin:delete',
      name: 't.permissions.admin.delete.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'admin:restore',
      name: 't.permissions.admin.restore.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'admin:activate',
      name: 't.permissions.admin.activate.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    IMPORT_PROFILE: {
      action: 'admin:import-profile',
      name: 't.permissions.admin.importProfile.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    GRANT_USER_ACCESS: {
      action: 'admin:grant-user-access',
      name: 't.permissions.admin.grantUserAccess.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    GRANT_CENTER_ACCESS: {
      action: 'admin:grant-center-access',
      name: 't.permissions.admin.grantCenterAccess.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'admin:read-all',
      name: 't.permissions.admin.readAll.name', // TODO: to implement
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'admin:import',
      name: 't.permissions.admin.import.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'admin:export',
      name: 't.permissions.admin.export.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== CENTER MANAGEMENT PERMISSIONS =====
  CENTER: {
    CREATE: {
      action: 'center:create',
      name: 't.permissions.center.create.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'center:update',
      name: 't.permissions.center.update.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'center:delete',
      name: 't.permissions.center.delete.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'center:restore',
      name: 't.permissions.center.restore.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'center:activate',
      name: 't.permissions.center.activate.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'center:read-all',
      name: 't.permissions.center.readAll.name', // TODO: to implement
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'center:import',
      name: 't.permissions.center.import.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'center:export',
      name: 't.permissions.center.export.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ROLE MANAGEMENT PERMISSIONS =====
  ROLES: {
    CREATE: {
      action: 'roles:create',
      name: 't.permissions.roles.create.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    UPDATE: {
      action: 'roles:update',
      name: 't.permissions.roles.update.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    DELETE: {
      action: 'roles:delete',
      name: 't.permissions.roles.delete.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    RESTORE: {
      action: 'roles:restore',
      name: 't.permissions.roles.restore.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    ASSIGN: {
      action: 'roles:assign',
      name: 't.permissions.roles.assign.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    IMPORT: {
      action: 'roles:import',
      name: 't.permissions.roles.import.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    EXPORT: {
      action: 'roles:export',
      name: 't.permissions.roles.export.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
  },

  // ===== BRANCH MANAGEMENT PERMISSIONS =====
  BRANCHES: {
    CREATE: {
      action: 'branches:create',
      name: 't.permissions.branches.create.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'branches:update',
      name: 't.permissions.branches.update.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'branches:delete',
      name: 't.permissions.branches.delete.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'branches:restore',
      name: 't.permissions.branches.restore.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE: {
      action: 'branches:activate',
      name: 't.permissions.branches.activate.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'branches:import',
      name: 't.permissions.branches.import.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'branches:export',
      name: 't.permissions.branches.export.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'branches:read-all',
      name: 't.permissions.branches.readAll.name', // TODO: to implement
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== SYSTEM PERMISSIONS =====
  SYSTEM: {
    HEALTH_CHECK: {
      action: 'system:health-check',
      name: 't.permissions.system.healthCheck.name',
      group: 'system',
      scope: PermissionScope.ADMIN,
    },
  },
} as const;

export type PermissionsObject = typeof PERMISSIONS;
export type PermissionObject = PermissionsObject[keyof PermissionsObject];
export interface IPermission {
  action: string;
  name: string;
  group: string;
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
