import { Role } from '@/modules/access-control/entities/role.entity';
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
    description: 'Parent with access to student information across all centers',
    rolePermissions: [],
    centerId: undefined,
    readOnly: true,
  },
  {
    name: 'Student',
    description:
      'Student with basic access to center resources across all centers',
    rolePermissions: [],
    centerId: undefined,
    readOnly: true,
  },
  {
    name: 'Teacher',
    description:
      'Teacher with educational content management access across all centers',
    rolePermissions: [],
    centerId: undefined,
    readOnly: true,
  },
];

// ADMIN Roles (Global scope, centerId = null)
export const ADMIN_ROLES: Partial<Role>[] = [
  {
    name: 't.roles.superAdmin.name',
    description: 't.roles.superAdmin.description',
    rolePermissions: [], // All permissions
    centerId: undefined,
    readOnly: true,
  },
  {
    name: 'Country Manager',
    description:
      'Country-level manager with administrative access to all centers in the country',
    rolePermissions: [],
    centerId: undefined,
  },
  {
    name: 'Technical Support',
    description: 'Technical support staff with system maintenance access',
    rolePermissions: [],
    centerId: undefined,
  },
  {
    name: 'Language Centers Manager',
    description: 'Manager responsible for all language centers',
    rolePermissions: [],
    centerId: undefined,
  },
  {
    name: 'Academic Centers Manager',
    description: 'Manager responsible for all academic centers',
    rolePermissions: [],
    centerId: undefined,
  },
];

// CENTER Roles (Center-specific, centerId = specific center)
export const CENTER_ROLES: Partial<Role>[] = [
  {
    name: 'Owner',
    description: 'Ultimate center owner with full access within the center',
    rolePermissions: [], // Ultimate access - all permissions
    readOnly: true,
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Manager',
    description: 'Center manager with management capabilities',
    rolePermissions: [],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Assistant',
    description: 'Center assistant with limited administrative access',
    rolePermissions: [],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Accountant',
    description: 'Center accountant with financial access',
    rolePermissions: [],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Cleaner',
    description: 'Center maintenance staff with basic access',
    rolePermissions: [],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Receptionist',
    description: 'Center receptionist with front desk access',
    rolePermissions: [],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Security Guard',
    description: 'Center security guard with monitoring access',
    rolePermissions: [],
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
  const randomRoles: Partial<Role>[] = [];

  for (let i = 0; i < count; i++) {
    const centerId = faker.helpers.arrayElement(centerIds);

    const jobTitle = faker.person.jobTitle();

    randomRoles.push({
      name: jobTitle.length > 100 ? jobTitle.substring(0, 100) : jobTitle,
      description: faker.lorem.sentence(),
      rolePermissions: [],
      centerId,
    });
  }

  return randomRoles;
};
