// Maintain backward compatibility with RoleTypeEnum
export enum RoleType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CENTER_ADMIN = 'CENTER_ADMIN',
  USER = 'USER',
}

export const ROLE_HIERARCHY = {
  [RoleType.SUPER_ADMIN]: 4, // Highest level - No constraints
  [RoleType.ADMIN]: 3, // Constrained by SuperAdmin
  [RoleType.CENTER_ADMIN]: 2, // No constraints within center
  [RoleType.USER]: 1, // Lowest level - Fully constrained
};

export const ROLE_DESCRIPTIONS = {
  [RoleType.SUPER_ADMIN]:
    'Super Administrator - No constraints, sees everything',
  [RoleType.ADMIN]:
    'Administrator - Constrained by SuperAdmin (permissions + AdminCenterAccess + UserAccess)',
  [RoleType.CENTER_ADMIN]:
    'Center Administrator - No constraints within center, sees everything',
  [RoleType.USER]: 'User - Fully constrained (permissions + UserAccess)',
};

export const ROLE_SCOPES = {
  [RoleType.SUPER_ADMIN]: 'ADMIN',
  [RoleType.ADMIN]: 'ADMIN',
  [RoleType.CENTER_ADMIN]: 'CENTER',
  [RoleType.USER]: 'CENTER',
};

// New: Role constraint types
export const ROLE_CONSTRAINTS = {
  [RoleType.SUPER_ADMIN]: {
    needsPermissions: false,
    needsAdminCenterAccess: false,
    needsUserAccess: false,
    description: 'No constraints - sees everything',
  },
  [RoleType.ADMIN]: {
    needsPermissions: true,
    needsAdminCenterAccess: true,
    needsUserAccess: true,
    description: 'Constrained by SuperAdmin',
  },
  [RoleType.CENTER_ADMIN]: {
    needsPermissions: false, // Within their center
    needsAdminCenterAccess: false,
    needsUserAccess: false,
    description: 'No constraints within center',
  },
  [RoleType.USER]: {
    needsPermissions: true,
    needsAdminCenterAccess: false,
    needsUserAccess: true,
    description: 'Fully constrained',
  },
};
