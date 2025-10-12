import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
} from '@/modules/access-control/constants/permissions';
import { faker } from '@faker-js/faker';

// Read-only roles that cannot be changed
export const READ_ONLY_ROLES = [
  'Super Administrator',
  'Owner',
  'Parent',
  'Student',
  'Teacher',
];

// SYSTEM Roles (Global scope, centerId = null)
export const SYSTEM_ROLES: Partial<Role>[] = [
  {
    name: 'Parent',
    type: RoleType.SYSTEM,
    description: 'Parent with access to student information across all centers',
    permissions: [PERMISSIONS.USER.READ.action, PERMISSIONS.CENTER.VIEW.action],
    centerId: undefined,
    readOnly: true,
  },
  {
    name: 'Student',
    type: RoleType.SYSTEM,
    description:
      'Student with basic access to center resources across all centers',
    permissions: [PERMISSIONS.USER.READ.action, PERMISSIONS.CENTER.VIEW.action],
    centerId: undefined,
    readOnly: true,
  },
  {
    name: 'Teacher',
    type: RoleType.SYSTEM,
    description:
      'Teacher with educational content management access across all centers',
    permissions: [
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
    ],
    centerId: undefined,
    readOnly: true,
  },
];

// ADMIN Roles (Global scope, centerId = null)
export const ADMIN_ROLES: Partial<Role>[] = [
  {
    name: 'Super Administrator',
    type: RoleType.ADMIN,
    description: 'Ultimate system administrator with full access to everything',
    permissions: ['*'], // All permissions
    centerId: undefined,
    readOnly: true,
  },
  {
    name: 'Country Manager',
    type: RoleType.ADMIN,
    description:
      'Country-level manager with administrative access to all centers in the country',
    permissions: [
      PERMISSIONS.USER.CREATE.action,
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.UPDATE.action,
      PERMISSIONS.USER.ACTIVATE.action,
      PERMISSIONS.CENTER.CREATE.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.CENTER.UPDATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.CREATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.UPDATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.ASSIGN.action,
      PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.GRANT.action,
      PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.REVOKE.action,
    ],
    centerId: undefined,
  },
  {
    name: 'Technical Support',
    type: RoleType.ADMIN,
    description: 'Technical support staff with system maintenance access',
    permissions: [
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
    ],
    centerId: undefined,
  },
  {
    name: 'Language Centers Manager',
    type: RoleType.ADMIN,
    description: 'Manager responsible for all language centers',
    permissions: [
      PERMISSIONS.USER.CREATE.action,
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.UPDATE.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.CENTER.UPDATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.ASSIGN.action,
    ],
    centerId: undefined,
  },
  {
    name: 'Academic Centers Manager',
    type: RoleType.ADMIN,
    description: 'Manager responsible for all academic centers',
    permissions: [
      PERMISSIONS.USER.CREATE.action,
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.UPDATE.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.CENTER.UPDATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.ASSIGN.action,
    ],
    centerId: undefined,
  },
];

// CENTER Roles (Center-specific, centerId = specific center)
export const CENTER_ROLES: Partial<Role>[] = [
  {
    name: 'Owner',
    type: RoleType.CENTER,
    description: 'Ultimate center owner with full access within the center',
    permissions: ['*'], // Ultimate access - all permissions
    readOnly: true,
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Manager',
    type: RoleType.CENTER,
    description: 'Center manager with management capabilities',
    permissions: [
      PERMISSIONS.USER.CREATE.action,
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.UPDATE.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.ASSIGN.action,
    ],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Assistant',
    type: RoleType.CENTER,
    description: 'Center assistant with limited administrative access',
    permissions: [
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.UPDATE.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
    ],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Accountant',
    type: RoleType.CENTER,
    description: 'Center accountant with financial access',
    permissions: [
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.CENTER.UPDATE.action,
    ],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Cleaner',
    type: RoleType.CENTER,
    description: 'Center maintenance staff with basic access',
    permissions: [PERMISSIONS.CENTER.VIEW.action],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Receptionist',
    type: RoleType.CENTER,
    description: 'Center receptionist with front desk access',
    permissions: [
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.CREATE.action,
      PERMISSIONS.CENTER.VIEW.action,
    ],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Security Guard',
    type: RoleType.CENTER,
    description: 'Center security guard with monitoring access',
    permissions: [PERMISSIONS.CENTER.VIEW.action],
    // centerId will be set when creating roles for specific centers
  },
];

// Helper function to create center-specific roles
export const createCenterSpecificRoles = (
  centerId: string,
): Partial<Role>[] => {
  return CENTER_ROLES.map((role) => ({
    ...role,
    centerId,
    // Keep role names clean without center names
    name: role.name,
    description: role.description,
  }));
};

// Helper function to get all role definitions
export const getAllRoleDefinitions = (centerIds: string[]): Partial<Role>[] => {
  const systemRoles = SYSTEM_ROLES;
  const adminRoles = ADMIN_ROLES;
  const centerSpecificRoles = centerIds.flatMap((centerId) =>
    createCenterSpecificRoles(centerId),
  );

  return [...systemRoles, ...adminRoles, ...centerSpecificRoles];
};

// Helper function to create additional random roles for variety
export const createRandomRoles = (
  centerIds: string[],
  count: number = 3,
): Partial<Role>[] => {
  const roleTypes = [RoleType.CENTER];
  const randomRoles: Partial<Role>[] = [];

  for (let i = 0; i < count; i++) {
    const centerId = faker.helpers.arrayElement(centerIds);
    const roleType = faker.helpers.arrayElement(roleTypes);
    const permissions = faker.helpers.arrayElements(
      ALL_PERMISSIONS.map((p) => p.action),
      { min: 2, max: 8 },
    );

    const jobTitle = faker.person.jobTitle();

    randomRoles.push({
      name: jobTitle.length > 100 ? jobTitle.substring(0, 100) : jobTitle,
      type: roleType,
      description: faker.lorem.sentence(),
      permissions,
      centerId,
    });
  }

  return randomRoles;
};
