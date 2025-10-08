// New role type hierarchy
export enum RoleType {
  // System roles - for system-wide users like Parent, Student, Teacher
  SYSTEM = 'SYSTEM',

  // Admin roles - for administrative users like SuperAdmin, TechnicalSupport, RegionalManager
  ADMIN = 'ADMIN',

  // User roles - for center-specific users like Assistant, Worker, AssistantManager, CenterOwner
  CENTER = 'CENTER',
}

export const ROLE_HIERARCHY = {
  [RoleType.SYSTEM]: 3, // System-wide access
  [RoleType.ADMIN]: 2, // Admin access with center permissions
  [RoleType.CENTER]: 1, // Center-specific access
};

export const ROLE_DESCRIPTIONS = {
  [RoleType.SYSTEM]:
    'System User - System-wide access (Parent, Student, Teacher)',
  [RoleType.ADMIN]:
    'Administrator - Admin access with center permissions (SuperAdmin, TechnicalSupport, RegionalManager)',
  [RoleType.CENTER]:
    'Center User - Center-specific access (Assistant, Worker, AssistantManager, CenterOwner)',
};

export const ROLE_SCOPES = {
  [RoleType.SYSTEM]: 'SYSTEM', // System-wide scope
  [RoleType.ADMIN]: 'ADMIN', // Admin scope with center access
  [RoleType.CENTER]: 'CENTER', // Center-specific scope
};

// Role constraint types
export const ROLE_CONSTRAINTS = {
  [RoleType.SYSTEM]: {
    needsPermissions: false,
    needsAdminCenterAccess: false,
    needsUserAccess: false,
    description: 'System-wide access - no constraints',
  },
  [RoleType.ADMIN]: {
    needsPermissions: true,
    needsAdminCenterAccess: true, // NEW: Admins need admin access to centers
    needsUserAccess: true,
    description: 'Admin access with center permissions',
  },
  [RoleType.CENTER]: {
    needsPermissions: true,
    needsAdminCenterAccess: false,
    needsUserAccess: true,
    description: 'Center-specific access - fully constrained',
  },
};
