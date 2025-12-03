import { I18nPath } from '@/generated/i18n.generated';

export enum PermissionScope {
  ADMIN = 'ADMIN',
  CENTER = 'CENTER',
  BOTH = 'BOTH',
}

// Permission constants for type safety and autocompletion

interface ICorrectPermission {
  action: string;
  name: I18nPath;
  group: string;
  scope: PermissionScope;
}

export const PERMISSIONS: {
  [key: string]: { [key: string]: ICorrectPermission };
} = {
  // ===== STAFF MANAGEMENT PERMISSIONS =====
  STAFF: {
    // center scope
    READ: {
      action: 'staff:read',
      name: 'permissions.staff.read.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'staff:create',
      name: 'permissions.staff.create.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    GRANT_USER_ACCESS: {
      action: 'staff:grant-user-access',
      name: 'permissions.staff.grantUserAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    GRANT_BRANCH_ACCESS: {
      action: 'staff:grant-branch-access',
      name: 'permissions.staff.grantBranchAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'staff:delete-center-access',
      name: 'permissions.staff.deleteCenterAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'staff:restore-center-access',
      name: 'permissions.staff.restoreCenterAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'staff:activate-center-access',
      name: 'permissions.staff.activateCenterAccess.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'staff:read-all',
      name: 'permissions.staff.readAll.name', // TODO: to implement
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'staff:import',
      name: 'permissions.staff.import.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'staff:export',
      name: 'permissions.staff.export.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'staff:import-profile',
      name: 'permissions.staff.importProfile.name',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'staff:grant-center-access',
      name: 'permissions.staff.grantCenterAccess.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'staff:update',
      name: 'permissions.staff.update.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'staff:delete',
      name: 'permissions.staff.delete.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'staff:restore',
      name: 'permissions.staff.restore.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'staff:activate',
      name: 'permissions.staff.activate.name',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== STUDENT MANAGEMENT PERMISSIONS =====
  STUDENT: {
    // center scope
    READ: {
      action: 'student:read',
      name: 'permissions.student.read.name',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'student:create',
      name: 'permissions.student.create.name',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'student:delete-center-access',
      name: 'permissions.student.deleteCenterAccess.name',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'student:restore-center-access',
      name: 'permissions.student.restoreCenterAccess.name',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'student:activate-center-access',
      name: 'permissions.student.activateCenterAccess.name',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'student:read-all',
      name: 'permissions.student.readAll.name', // TODO: to implement
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'student:import',
      name: 'permissions.student.import.name',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'student:export',
      name: 'permissions.student.export.name',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'student:import-profile',
      name: 'permissions.student.importProfile.name',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'student:grant-center-access',
      name: 'permissions.student.grantCenterAccess.name',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'student:update',
      name: 'permissions.student.update.name',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'student:delete',
      name: 'permissions.student.delete.name',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'student:restore',
      name: 'permissions.student.restore.name',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'student:activate',
      name: 'permissions.student.activate.name',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== TEACHER MANAGEMENT PERMISSIONS =====
  TEACHER: {
    // center scope
    READ: {
      action: 'teacher:read',
      name: 'permissions.teacher.read.name',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'teacher:create',
      name: 'permissions.teacher.create.name',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'teacher:delete-center-access',
      name: 'permissions.teacher.deleteCenterAccess.name',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'teacher:restore-center-access',
      name: 'permissions.teacher.restoreCenterAccess.name',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'teacher:activate-center-access',
      name: 'permissions.teacher.activateCenterAccess.name',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'teacher:read-all',
      name: 'permissions.teacher.readAll.name', // TODO: to implement
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'teacher:import',
      name: 'permissions.teacher.import.name',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'teacher:export',
      name: 'permissions.teacher.export.name',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'teacher:import-profile',
      name: 'permissions.teacher.importProfile.name',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'teacher:grant-center-access',
      name: 'permissions.teacher.grantCenterAccess.name',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'teacher:update',
      name: 'permissions.teacher.update.name',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'teacher:delete',
      name: 'permissions.teacher.delete.name',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'teacher:restore',
      name: 'permissions.teacher.restore.name',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'teacher:activate',
      name: 'permissions.teacher.activate.name',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ADMIN MANAGEMENT PERMISSIONS =====
  ADMIN: {
    READ: {
      action: 'admin:read',
      name: 'permissions.admin.read.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    CREATE: {
      action: 'admin:create',
      name: 'permissions.admin.create.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'admin:update',
      name: 'permissions.admin.update.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'admin:delete',
      name: 'permissions.admin.delete.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'admin:restore',
      name: 'permissions.admin.restore.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'admin:activate',
      name: 'permissions.admin.activate.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    IMPORT_PROFILE: {
      action: 'admin:import-profile',
      name: 'permissions.admin.importProfile.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    GRANT_USER_ACCESS: {
      action: 'admin:grant-user-access',
      name: 'permissions.admin.grantUserAccess.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    GRANT_CENTER_ACCESS: {
      action: 'admin:grant-center-access',
      name: 'permissions.admin.grantCenterAccess.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'admin:read-all',
      name: 'permissions.admin.readAll.name', // TODO: to implement
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'admin:import',
      name: 'permissions.admin.import.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'admin:export',
      name: 'permissions.admin.export.name',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== CENTER MANAGEMENT PERMISSIONS =====
  CENTER: {
    CREATE: {
      action: 'center:create',
      name: 'permissions.center.create.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'center:update',
      name: 'permissions.center.update.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'center:delete',
      name: 'permissions.center.delete.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'center:restore',
      name: 'permissions.center.restore.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'center:activate',
      name: 'permissions.center.activate.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'center:read-all',
      name: 'permissions.center.readAll.name', // TODO: to implement
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'center:import',
      name: 'permissions.center.import.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'center:export',
      name: 'permissions.center.export.name',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ROLE MANAGEMENT PERMISSIONS =====
  ROLES: {
    CREATE: {
      action: 'roles:create',
      name: 'permissions.roles.create.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    UPDATE: {
      action: 'roles:update',
      name: 'permissions.roles.update.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    DELETE: {
      action: 'roles:delete',
      name: 'permissions.roles.delete.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    RESTORE: {
      action: 'roles:restore',
      name: 'permissions.roles.restore.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    ASSIGN: {
      action: 'roles:assign',
      name: 'permissions.roles.assign.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    IMPORT: {
      action: 'roles:import',
      name: 'permissions.roles.import.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    EXPORT: {
      action: 'roles:export',
      name: 'permissions.roles.export.name',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
  },

  // ===== BRANCH MANAGEMENT PERMISSIONS =====
  BRANCHES: {
    CREATE: {
      action: 'branches:create',
      name: 'permissions.branches.create.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'branches:update',
      name: 'permissions.branches.update.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'branches:delete',
      name: 'permissions.branches.delete.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'branches:restore',
      name: 'permissions.branches.restore.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE: {
      action: 'branches:activate',
      name: 'permissions.branches.activate.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'branches:import',
      name: 'permissions.branches.import.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'branches:export',
      name: 'permissions.branches.export.name',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'branches:read-all',
      name: 'permissions.branches.readAll.name', // TODO: to implement
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== SYSTEM PERMISSIONS =====
  SYSTEM: {
    HEALTH_CHECK: {
      action: 'system:health-check',
      name: 'permissions.system.healthCheck.name',
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
