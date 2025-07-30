export enum RoleTypeEnum {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CENTER_ADMIN = 'CENTER_ADMIN',
  USER = 'USER',
}

export const ROLE_HIERARCHY = {
  [RoleTypeEnum.SUPER_ADMIN]: 4, // Highest level - No constraints
  [RoleTypeEnum.ADMIN]: 3, // Constrained by SuperAdmin
  [RoleTypeEnum.CENTER_ADMIN]: 2, // No constraints within center
  [RoleTypeEnum.USER]: 1, // Lowest level - Fully constrained
};

export const ROLE_DESCRIPTIONS = {
  [RoleTypeEnum.SUPER_ADMIN]:
    'Super Administrator - No constraints, sees everything',
  [RoleTypeEnum.ADMIN]:
    'Administrator - Constrained by SuperAdmin (permissions + AdminCenterAccess + UserAccess)',
  [RoleTypeEnum.CENTER_ADMIN]:
    'Center Administrator - No constraints within center, sees everything',
  [RoleTypeEnum.USER]:
    'Regular User - Fully constrained (permissions + UserAccess)',
};

export const ROLE_SCOPES = {
  [RoleTypeEnum.SUPER_ADMIN]: 'ADMIN',
  [RoleTypeEnum.ADMIN]: 'ADMIN',
  [RoleTypeEnum.CENTER_ADMIN]: 'CENTER',
  [RoleTypeEnum.USER]: 'CENTER',
};

// New: Role constraint types
export const ROLE_CONSTRAINTS = {
  [RoleTypeEnum.SUPER_ADMIN]: {
    needsPermissions: false,
    needsAdminCenterAccess: false,
    needsUserAccess: false,
    description: 'No constraints - sees everything',
  },
  [RoleTypeEnum.ADMIN]: {
    needsPermissions: true,
    needsAdminCenterAccess: true,
    needsUserAccess: true,
    description: 'Constrained by SuperAdmin',
  },
  [RoleTypeEnum.CENTER_ADMIN]: {
    needsPermissions: false, // Within their center
    needsAdminCenterAccess: false,
    needsUserAccess: false,
    description: 'No constraints within center',
  },
  [RoleTypeEnum.USER]: {
    needsPermissions: true,
    needsAdminCenterAccess: false,
    needsUserAccess: true,
    description: 'Fully constrained',
  },
};
