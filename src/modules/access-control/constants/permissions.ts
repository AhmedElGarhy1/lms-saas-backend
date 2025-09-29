// Permission constants for type safety and autocompletion
export const PERMISSIONS = {
  USER: {
    CREATE: {
      action: 'user:create',
      name: 'Create Users',
      isAdmin: false,
    },
    READ: {
      action: 'user:read',
      name: 'Read Users',
      isAdmin: false,
    },
    UPDATE: {
      action: 'user:update',
      name: 'Update Users',
      isAdmin: false,
    },
    DELETE: {
      action: 'user:delete',
      name: 'Delete Users',
      isAdmin: false,
    },
    ACTIVATE: {
      action: 'user:activate',
      name: 'Activate Users',
      isAdmin: false,
    },
    RESTORE: {
      action: 'user:restore',
      name: 'Restore Users',
      isAdmin: false,
    },
  },
  CENTER: {
    CREATE: {
      action: 'center:create',
      name: 'Create Centers',
      isAdmin: true,
    },
    VIEW: {
      action: 'center:view',
      name: 'View Centers',
      isAdmin: true,
    },
    UPDATE: {
      action: 'center:update',
      name: 'Update Centers',
      isAdmin: true,
    },
    DELETE: {
      action: 'center:delete',
      name: 'Delete Centers',
      isAdmin: true,
    },
    RESTORE: {
      action: 'center:restore',
      name: 'Restore Centers',
      isAdmin: true,
    },
  },
  ACCESS_CONTROL: {
    ROLES: {
      VIEW: {
        action: 'access-control:roles:view',
        name: 'View Roles',
        isAdmin: false,
      },
      CREATE: {
        action: 'access-control:roles:create',
        name: 'Create Role',
        isAdmin: false,
      },
      UPDATE: {
        action: 'access-control:roles:update',
        name: 'Update Role',
        isAdmin: false,
      },
      DELETE: {
        action: 'access-control:roles:delete',
        name: 'Delete Role',
        isAdmin: false,
      },
      ASSIGN: {
        action: 'access-control:roles:assign',
        name: 'Assign Role',
        isAdmin: false,
      },
      REMOVE: {
        action: 'access-control:roles:remove',
        name: 'Remove Role',
        isAdmin: false,
      },
    },
    USER_ACCESS: {
      GRANT: {
        action: 'access-control:user-access:grant',
        name: 'Grant User Access',
        isAdmin: false,
      },
      REVOKE: {
        action: 'access-control:user-access:revoke',
        name: 'Revoke User Access',
        isAdmin: false,
      },
    },
    CENTER_ACCESS: {
      GRANT: {
        action: 'access-control:center-access:grant',
        name: 'Add User to Center',
        isAdmin: false,
      },
      REVOKE: {
        action: 'access-control:center-access:revoke',
        name: 'Remove User from Center',
        isAdmin: false,
      },
    },
  },
} as const;

// Type for permission objects
export type PermissionObject = {
  action: string;
  name: string;
  isAdmin: boolean;
};

// Helper function to extract all permission objects from the const structure
function extractPermissionObjects(
  obj: Record<string, any>,
): PermissionObject[] {
  const permissions: PermissionObject[] = [];
  for (const key in obj) {
    const value = obj[key];
    if (
      value &&
      typeof value === 'object' &&
      'action' in value &&
      'name' in value &&
      'isAdmin' in value
    ) {
      permissions.push(value as PermissionObject);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      permissions.push(...extractPermissionObjects(value));
    }
  }
  return permissions;
}

// Flattened permission array for backward compatibility
export const ALL_PERMISSIONS = extractPermissionObjects(PERMISSIONS);

// Admin permissions (isAdmin: true)
export const ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter(
  (permission) => permission.isAdmin,
);

// User permissions (isAdmin: false) - all permissions except admin-specific ones
export const USER_PERMISSIONS = ALL_PERMISSIONS.filter(
  (permission) => !permission.isAdmin,
);

export const isAdminPermission = (permission: string): boolean => {
  return ADMIN_PERMISSIONS.some((p) => p.action === permission);
};

export const isUserPermission = (permission: string): boolean => {
  return USER_PERMISSIONS.some((p) => p.action === permission);
};
