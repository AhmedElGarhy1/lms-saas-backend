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
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'staff:create',
      scope: PermissionScope.CENTER,
    },
    GRANT_STAFF_ACCESS: {
      action: 'staff:grant-staff-access',
      scope: PermissionScope.CENTER,
    },
    GRANT_TEACHER_ACCESS: {
      action: 'staff:grant-teacher-access',
      scope: PermissionScope.CENTER,
    },
    GRANT_BRANCH_ACCESS: {
      action: 'staff:grant-branch-access',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'staff:delete-center-access',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'staff:restore-center-access',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'staff:activate-center-access',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'staff:read-all',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'staff:import',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'staff:export',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'staff:import-profile',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'staff:grant-center-access',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'staff:update',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'staff:delete',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'staff:restore',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'staff:activate',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== STUDENT MANAGEMENT PERMISSIONS =====
  STUDENT: {
    // center scope
    READ: {
      action: 'student:read',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'student:create',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'student:delete-center-access',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'student:restore-center-access',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'student:activate-center-access',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'student:read-all',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'student:import',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'student:export',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'student:import-profile',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'student:grant-center-access',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'student:update',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'student:delete',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'student:restore',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'student:activate',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== TEACHER MANAGEMENT PERMISSIONS =====
  TEACHER: {
    // center scope
    READ: {
      action: 'teacher:read',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'teacher:create',
      scope: PermissionScope.CENTER,
    },
    DELETE_CENTER_ACCESS: {
      action: 'teacher:delete-center-access',
      scope: PermissionScope.CENTER,
    },
    RESTORE_CENTER_ACCESS: {
      action: 'teacher:restore-center-access',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE_CENTER_ACCESS: {
      action: 'teacher:activate-center-access',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'teacher:read-all',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'teacher:import',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'teacher:export',
      scope: PermissionScope.CENTER,
    },
    IMPORT_PROFILE: {
      action: 'teacher:import-profile',
      scope: PermissionScope.CENTER,
    },
    // admin scope
    GRANT_CENTER_ACCESS: {
      action: 'teacher:grant-center-access',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'teacher:update',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'teacher:delete',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'teacher:restore',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'teacher:activate',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ADMIN MANAGEMENT PERMISSIONS =====
  ADMIN: {
    READ: {
      action: 'admin:read',
      scope: PermissionScope.ADMIN,
    },
    CREATE: {
      action: 'admin:create',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'admin:update',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'admin:delete',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'admin:restore',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'admin:activate',
      scope: PermissionScope.ADMIN,
    },
    IMPORT_PROFILE: {
      action: 'admin:import-profile',
      scope: PermissionScope.ADMIN,
    },
    GRANT_ADMIN_ACCESS: {
      action: 'admin:grant-admin-access',
      scope: PermissionScope.ADMIN,
    },
    GRANT_CENTER_ACCESS: {
      action: 'admin:grant-center-access',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'admin:read-all',
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'admin:import',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'admin:export',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== CENTER MANAGEMENT PERMISSIONS =====
  CENTER: {
    CREATE: {
      action: 'center:create',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'center:update',
      scope: PermissionScope.ADMIN,
    },
    DELETE: {
      action: 'center:delete',
      scope: PermissionScope.ADMIN,
    },
    RESTORE: {
      action: 'center:restore',
      scope: PermissionScope.ADMIN,
    },
    ACTIVATE: {
      action: 'center:activate',
      scope: PermissionScope.ADMIN,
    },
    READ_ALL: {
      action: 'center:read-all',
      scope: PermissionScope.ADMIN,
    },
    IMPORT: {
      action: 'center:import',
      scope: PermissionScope.ADMIN,
    },
    EXPORT: {
      action: 'center:export',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== ROLE MANAGEMENT PERMISSIONS =====
  ROLES: {
    CREATE: {
      action: 'roles:create',
      scope: PermissionScope.BOTH,
    },
    UPDATE: {
      action: 'roles:update',
      scope: PermissionScope.BOTH,
    },
    DELETE: {
      action: 'roles:delete',
      scope: PermissionScope.BOTH,
    },
    RESTORE: {
      action: 'roles:restore',
      scope: PermissionScope.BOTH,
    },
    ASSIGN: {
      action: 'roles:assign',
      scope: PermissionScope.BOTH,
    },
    IMPORT: {
      action: 'roles:import',
      scope: PermissionScope.BOTH,
    },
    EXPORT: {
      action: 'roles:export',
      scope: PermissionScope.BOTH,
    },
  },

  // ===== BRANCH MANAGEMENT PERMISSIONS =====
  BRANCHES: {
    CREATE: {
      action: 'branches:create',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'branches:update',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'branches:delete',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'branches:restore',
      scope: PermissionScope.CENTER,
    },
    ACTIVATE: {
      action: 'branches:activate',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'branches:import',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'branches:export',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'branches:read-all',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== LEVELS PERMISSIONS =====
  LEVELS: {
    READ: {
      action: 'levels:read',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'levels:create',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'levels:update',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'levels:delete',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'levels:restore',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'levels:read-all',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'levels:import',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'levels:export',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== SUBJECTS PERMISSIONS =====
  SUBJECTS: {
    READ: {
      action: 'subjects:read',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'subjects:create',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'subjects:update',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'subjects:delete',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'subjects:restore',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'subjects:read-all',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'subjects:import',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'subjects:export',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== CLASSES PERMISSIONS =====
  CLASSES: {
    READ: {
      action: 'classes:read',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'classes:create',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'classes:update',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'classes:delete',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'classes:restore',
      scope: PermissionScope.CENTER,
    },
    MANAGE_CLASS_STAFF_ACCESS: {
      action: 'classes:manage-class-staff-access',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'classes:read-all',
      scope: PermissionScope.CENTER,
    },
    IMPORT: {
      action: 'classes:import',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'classes:export',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== GROUPS PERMISSIONS =====
  GROUPS: {
    READ: {
      action: 'groups:read',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'groups:create',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'groups:update',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'groups:delete',
      scope: PermissionScope.CENTER,
    },
    RESTORE: {
      action: 'groups:restore',
      scope: PermissionScope.CENTER,
    },
    MANAGE_GROUP_STUDENT_ACCESS: {
      action: 'groups:manage-group-student-access',
      scope: PermissionScope.CENTER,
    },
    READ_ALL: {
      action: 'groups:read-all',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== SESSIONS PERMISSIONS =====
  SESSIONS: {
    READ: {
      action: 'sessions:read',
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'sessions:create',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'sessions:update',
      scope: PermissionScope.CENTER,
    },
    DELETE: {
      action: 'sessions:delete',
      scope: PermissionScope.CENTER,
    },
    EXPORT: {
      action: 'sessions:export',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== STUDENT BILLING PERMISSIONS =====
  STUDENT_BILLING: {
    READ_STUDENT_CHARGE: {
      action: 'student-billing:read-student-charge',
      scope: PermissionScope.CENTER,
    },
    READ_STUDENT_RECORDS: {
      action: 'student-billing:read-student-records',
      scope: PermissionScope.CENTER,
    },
    REFUND_BILLING: {
      action: 'student-billing:refund-billing',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== TEACHER PAYOUTS PERMISSIONS =====
  TEACHER_PAYOUTS: {
    READ_PAYOUTS: {
      action: 'teacher-payouts:read-payouts',
      scope: PermissionScope.CENTER,
    },
    UPDATE_PAYOUT_STATUS: {
      action: 'teacher-payouts:update-payout-status',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== FINANCE PERMISSIONS =====
  FINANCE: {
    // Payment management
    READ_PAYMENTS: {
      action: 'finance:read-payments',
      scope: PermissionScope.CENTER,
    },

    // Treasury and statements
    READ_TREASURY: {
      action: 'finance:read-treasury',
      scope: PermissionScope.CENTER,
    },
    READ_WALLET_STATEMENT: {
      action: 'finance:read-wallet-statement',
      scope: PermissionScope.CENTER,
    },
    READ_CASH_STATEMENT: {
      action: 'finance:read-cash-statement',
      scope: PermissionScope.CENTER,
    },

    // Branch withdrawals
    BRANCH_WALLET_WITHDRAW: {
      action: 'finance:branch-wallet-withdraw',
      scope: PermissionScope.CENTER,
    },
    BRANCH_CASH_WITHDRAW: {
      action: 'finance:branch-cash-withdraw',
      scope: PermissionScope.CENTER,
    },

    // Branch deposits
    BRANCH_WALLET_DEPOSIT: {
      action: 'finance:branch-wallet-deposit',
      scope: PermissionScope.CENTER,
    },
    BRANCH_CASH_DEPOSIT: {
      action: 'finance:branch-cash-deposit',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== EXPENSES PERMISSIONS =====
  EXPENSES: {
    CREATE: {
      action: 'expenses:create',
      scope: PermissionScope.CENTER,
    },
    READ: {
      action: 'expenses:read',
      scope: PermissionScope.CENTER,
    },
    UPDATE: {
      action: 'expenses:update',
      scope: PermissionScope.CENTER,
    },
    REFUND: {
      action: 'expenses:refund',
      scope: PermissionScope.CENTER,
    },
  },

  // ===== DASHBOARD & ANALYTICS PERMISSIONS =====
  DASHBOARD: {
    READ: {
      action: 'dashboard:read',
      scope: PermissionScope.CENTER,
    },
    READ_ALL_CENTERS: {
      action: 'dashboard:read-all-centers',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== SETTINGS PERMISSIONS =====
  SETTINGS: {
    READ: {
      action: 'settings:read',
      scope: PermissionScope.ADMIN,
    },
    UPDATE: {
      action: 'settings:update',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== SYSTEM PERMISSIONS =====
  SYSTEM: {
    HEALTH_CHECK: {
      action: 'system:health-check',
      scope: PermissionScope.ADMIN,
    },
  },

  // ===== NOTIFICATIONS PERMISSIONS =====
  NOTIFICATIONS: {
    READ_HISTORY: {
      action: 'notifications:read-history',
      scope: PermissionScope.ADMIN,
    },
  },
} as const;

export type PermissionsObject = typeof PERMISSIONS;
export type PermissionObject = PermissionsObject[keyof PermissionsObject];
export interface IPermission {
  action: string;
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
