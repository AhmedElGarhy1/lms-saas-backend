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
      name: 'Read Staff',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'staff:create',
      name: 'Create Staff',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    GRANT_STAFF_ACCESS: {
      action: 'staff:grant-staff-access',
      name: 'Grant Staff Access',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    GRANT_TEACHER_ACCESS: {
      action: 'staff:grant-teacher-access',
      name: 'Grant Teacher Access',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    GRANT_BRANCH_ACCESS: {
      action: 'staff:grant-branch-access',
      name: 'Grant Branch Access',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'staff:delete-center-access',
      name: 'Delete Center Access',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'staff:restore-center-access',
      name: 'Restore Center Access',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'staff:activate-center-access',
      name: 'Activate Center Access',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'staff:read-all',
      name: 'Read All Staff', // TODO: to implement
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'staff:import',
      name: 'Import Staff',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'staff:export',
      name: 'Export Staff',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'staff:import-profile',
      name: 'Import Staff Profile',
      group: 'staff',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'staff:grant-center-access',
      name: 'Grant Center Access',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'staff:update',
      name: 'Update Staff',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'staff:delete',
      name: 'Delete Staff',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'staff:restore',
      name: 'Restore Staff',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'staff:activate',
      name: 'Activate Staff',
      group: 'staff',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== STUDENT MANAGEMENT PERMISSIONS =====
  STUDENT: {
    // center scope
    READ: {
      action: 'student:read',
      name: 'Read Students',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'student:create',
      name: 'Create Students',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'student:delete-center-access',
      name: 'Delete Student Center Access',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'student:restore-center-access',
      name: 'Restore Student Center Access',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'student:activate-center-access',
      name: 'Activate Student Center Access',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'student:read-all',
      name: 'Read All Students', // TODO: to implement
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'student:import',
      name: 'Import Students',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'student:export',
      name: 'Export Students',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'student:import-profile',
      name: 'Import Student Profile',
      group: 'student',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'student:grant-center-access',
      name: 'Grant Student Center Access',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'student:update',
      name: 'Update Students',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'student:delete',
      name: 'Delete Students',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'student:restore',
      name: 'Restore Students',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'student:activate',
      name: 'Activate Students',
      group: 'student',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== TEACHER MANAGEMENT PERMISSIONS =====
  TEACHER: {
    // center scope
    READ: {
      action: 'teacher:read',
      name: 'Read Teachers',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'teacher:create',
      name: 'Create Teachers',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'teacher:delete-center-access',
      name: 'Delete Teacher Center Access',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'teacher:restore-center-access',
      name: 'Restore Teacher Center Access',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'teacher:activate-center-access',
      name: 'Activate Teacher Center Access',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'teacher:read-all',
      name: 'Read All Teachers', // TODO: to implement
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'teacher:import',
      name: 'Import Teachers',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'teacher:export',
      name: 'Export Teachers',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'teacher:import-profile',
      name: 'Import Teacher Profile',
      group: 'teacher',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'teacher:grant-center-access',
      name: 'Grant Teacher Center Access',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'teacher:update',
      name: 'Update Teachers',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'teacher:delete',
      name: 'Delete Teachers',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'teacher:restore',
      name: 'Restore Teachers',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'teacher:activate',
      name: 'Activate Teachers',
      group: 'teacher',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ADMIN MANAGEMENT PERMISSIONS =====
  ADMIN: {
    READ: {
      action: 'admin:read',
      name: 'Read Admins',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    CREATE: {
      action: 'admin:create',
      name: 'Create Admins',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'admin:update',
      name: 'Update Admins',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'admin:delete',
      name: 'Delete Admins',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'admin:restore',
      name: 'Restore Admins',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'admin:activate',
      name: 'Activate Admins',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    IMPORT_PROFILE: {
      action: 'admin:import-profile',
      name: 'Import Admin Profile',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    GRANT_ADMIN_ACCESS: {
      action: 'admin:grant-admin-access',
      name: 'Grant Admin Access',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    GRANT_CENTER_ACCESS: {
      action: 'admin:grant-center-access',
      name: 'Grant Admin Center Access',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'admin:read-all',
      name: 'Read All Admins', // TODO: to implement
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'admin:import',
      name: 'Import Admins',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'admin:export',
      name: 'Export Admins',
      group: 'admin',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== CENTER MANAGEMENT PERMISSIONS =====
  CENTER: {
    CREATE: {
      action: 'center:create',
      name: 'Create Centers',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'center:update',
      name: 'Update Centers',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'center:delete',
      name: 'Delete Centers',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'center:restore',
      name: 'Restore Centers',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'center:activate',
      name: 'Activate Centers',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'center:read-all',
      name: 'Read All Centers', // TODO: to implement
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'center:import',
      name: 'Import Centers',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'center:export',
      name: 'Export Centers',
      group: 'center',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ROLE MANAGEMENT PERMISSIONS =====
  ROLES: {
    CREATE: {
      action: 'roles:create',
      name: 'Create Roles',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    UPDATE: {
      action: 'roles:update',
      name: 'Update Roles',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    DELETE: {
      action: 'roles:delete',
      name: 'Delete Roles',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    RESTORE: {
      action: 'roles:restore',
      name: 'Restore Roles',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    ASSIGN: {
      action: 'roles:assign',
      name: 'Assign Roles',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    IMPORT: {
      action: 'roles:import',
      name: 'Import Roles',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
    EXPORT: {
      action: 'roles:export',
      name: 'Export Roles',
      group: 'roles',
      scope: PermissionScope.BOTH,
    },
  },

  // ===== BRANCH MANAGEMENT PERMISSIONS =====
  BRANCHES: {
    CREATE: {
      action: 'branches:create',
      name: 'Create Branches',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'branches:update',
      name: 'Update Branches',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'branches:delete',
      name: 'Delete Branches',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'branches:restore',
      name: 'Restore Branches',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE: {
      action: 'branches:activate',
      name: 'Activate Branches',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'branches:import',
      name: 'Import Branches',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'branches:export',
      name: 'Export Branches',
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'branches:read-all',
      name: 'Read All Branches', // TODO: to implement
      group: 'branches',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== LEVELS PERMISSIONS =====
  LEVELS: {
    READ: {
      action: 'levels:read',
      name: 'Read Levels',
      group: 'levels',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'levels:create',
      name: 'Create Levels',
      group: 'levels',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'levels:update',
      name: 'Update Levels',
      group: 'levels',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'levels:delete',
      name: 'Delete Levels',
      group: 'levels',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'levels:restore',
      name: 'Restore Levels',
      group: 'levels',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'levels:read-all',
      name: 'Read All Levels',
      group: 'levels',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'levels:import',
      name: 'Import Levels',
      group: 'levels',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'levels:export',
      name: 'Export Levels',
      group: 'levels',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== SUBJECTS PERMISSIONS =====
  SUBJECTS: {
    READ: {
      action: 'subjects:read',
      name: 'Read Subjects',
      group: 'subjects',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'subjects:create',
      name: 'Create Subjects',
      group: 'subjects',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'subjects:update',
      name: 'Update Subjects',
      group: 'subjects',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'subjects:delete',
      name: 'Delete Subjects',
      group: 'subjects',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'subjects:restore',
      name: 'Restore Subjects',
      group: 'subjects',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'subjects:read-all',
      name: 'Read All Subjects',
      group: 'subjects',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'subjects:import',
      name: 'Import Subjects',
      group: 'subjects',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'subjects:export',
      name: 'Export Subjects',
      group: 'subjects',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== CLASSES PERMISSIONS =====
  CLASSES: {
    READ: {
      action: 'classes:read',
      name: 'Read Classes',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'classes:create',
      name: 'Create Classes',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'classes:update',
      name: 'Update Classes',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'classes:delete',
      name: 'Delete Classes',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'classes:restore',
      name: 'Restore Classes',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
    MANAGE_CLASS_STAFF_ACCESS: {
      action: 'classes:manage-class-staff-access',
      name: 'Manage Class Staff Access',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'classes:read-all',
      name: 'Read All Classes',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'classes:import',
      name: 'Import Classes',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'classes:export',
      name: 'Export Classes',
      group: 'classes',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== PACKAGES PERMISSIONS =====
  PACKAGES: {
    READ: {
      action: 'packages:read',
      name: 'Read Packages',
      group: 'packages',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'packages:create',
      name: 'Create Packages',
      group: 'packages',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'packages:update',
      name: 'Update Packages',
      group: 'packages',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'packages:delete',
      name: 'Delete Packages',
      group: 'packages',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'packages:restore',
      name: 'Restore Packages',
      group: 'packages',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'packages:import',
      name: 'Import Packages',
      group: 'packages',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'packages:export',
      name: 'Export Packages',
      group: 'packages',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== ENROLLMENTS PERMISSIONS =====
  ENROLLMENTS: {
    READ: {
      action: 'enrollments:read',
      name: 'Read Enrollments',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'enrollments:create',
      name: 'Create Enrollments',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'enrollments:update',
      name: 'Update Enrollments',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'enrollments:delete',
      name: 'Delete Enrollments',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    REGISTER_CASH: {
      action: 'enrollments:register-cash',
      name: 'Register Cash Payment',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    VIEW_HISTORY: {
      action: 'enrollments:view-history',
      name: 'View Enrollment History',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    CHECK_IN: {
      action: 'enrollments:check-in',
      name: 'Check In Students',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    MARK_NO_SHOW: {
      action: 'enrollments:mark-no-show',
      name: 'Mark No Show',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'enrollments:restore',
      name: 'Restore Enrollments',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'enrollments:import',
      name: 'Import Enrollments',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'enrollments:export',
      name: 'Export Enrollments',
      group: 'enrollments',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== GROUPS PERMISSIONS =====
  GROUPS: {
    READ: {
      action: 'groups:read',
      name: 'Read Groups',
      group: 'groups',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'groups:create',
      name: 'Create Groups',
      group: 'groups',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'groups:update',
      name: 'Update Groups',
      group: 'groups',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'groups:delete',
      name: 'Delete Groups',
      group: 'groups',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'groups:restore',
      name: 'Restore Groups',
      group: 'groups',
      scope: PermissionScope.CENTER,
    },
    MANAGE_GROUP_STUDENT_ACCESS: {
      action: 'groups:manage-group-student-access',
      name: 'Manage Group Student Access',
      group: 'groups',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'groups:read-all',
      name: 'Read All Groups',
      group: 'groups',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== SESSIONS PERMISSIONS =====
  SESSIONS: {
    READ: {
      action: 'sessions:read',
      name: 'Read Sessions',
      group: 'sessions',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'sessions:create',
      name: 'Create Sessions',
      group: 'sessions',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'sessions:update',
      name: 'Update Sessions',
      group: 'sessions',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'sessions:delete',
      name: 'Delete Sessions',
      group: 'sessions',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'sessions:export',
      name: 'Export Sessions',
      group: 'sessions',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== SYSTEM PERMISSIONS =====
  SYSTEM: {
    HEALTH_CHECK: {
      action: 'system:health-check',
      name: 'System Health Check',
      group: 'system',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== FINANCE PERMISSIONS =====
  FINANCE: {
    MANAGE_FINANCE: {
      action: 'finance:manage-finance',
      name: 'Manage Finance',
      group: 'finance',
      scope: PermissionScope.ADMIN,
    },
    CASH_DEPOSIT: {
      action: 'finance:cash-deposit',
      name: 'Cash Deposit',
      group: 'finance',
      scope: PermissionScope.CENTER,
    },
    VIEW_CASHBOX: {
      action: 'finance:view-cashbox',
      name: 'View Cashbox',
      group: 'finance',
      scope: PermissionScope.CENTER,
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
