import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
} from '@/modules/access-control/constants/permissions';
import { faker } from '@faker-js/faker';

// Global Roles (centerId: undefined)
export const GLOBAL_ROLES: Partial<Role>[] = [
  {
    name: 'Super Administrator',
    type: RoleType.SUPER_ADMIN,
    description:
      'System-wide super administrator with full access to everything',
    permissions: ALL_PERMISSIONS.map((p) => p.action),
    centerId: undefined,
  },
  {
    name: 'System Administrator',
    type: RoleType.ADMIN,
    description: 'System administrator with global management capabilities',
    permissions: [
      PERMISSIONS.USER.CREATE.action,
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.UPDATE.action,
      PERMISSIONS.USER.DELETE.action,
      PERMISSIONS.USER.ACTIVATE.action,
      PERMISSIONS.CENTER.CREATE.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.CENTER.UPDATE.action,
      PERMISSIONS.CENTER.DELETE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.CREATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.UPDATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.DELETE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.ASSIGN.action,
      PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.GRANT.action,
      PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.REVOKE.action,
    ],
    centerId: undefined,
  },
  {
    name: 'Global Support',
    type: RoleType.ADMIN,
    description: 'Global support staff with limited administrative access',
    permissions: [
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
    ],
    centerId: undefined,
  },
];

// Center-Specific Roles (centerId: specific center)
export const CENTER_ROLES: Partial<Role>[] = [
  {
    name: 'Center Administrator',
    type: RoleType.CENTER_ADMIN,
    description: 'Full administrative access within the center',
    permissions: [
      PERMISSIONS.USER.CREATE.action,
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.UPDATE.action,
      PERMISSIONS.USER.DELETE.action,
      PERMISSIONS.USER.ACTIVATE.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.CENTER.UPDATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.CREATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.UPDATE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.DELETE.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.ASSIGN.action,
      PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.GRANT.action,
      PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.REVOKE.action,
    ],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Center Manager',
    type: RoleType.USER,
    description: 'Center manager with management capabilities',
    permissions: [
      PERMISSIONS.USER.CREATE.action,
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.USER.UPDATE.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
    ],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Teacher',
    type: RoleType.USER,
    description: 'Teacher with educational content management access',
    permissions: [
      PERMISSIONS.USER.READ.action,
      PERMISSIONS.CENTER.VIEW.action,
      PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action,
    ],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Student',
    type: RoleType.USER,
    description: 'Student with basic access to center resources',
    permissions: [PERMISSIONS.USER.READ.action, PERMISSIONS.CENTER.VIEW.action],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Parent',
    type: RoleType.USER,
    description: 'Parent with access to student information',
    permissions: [PERMISSIONS.USER.READ.action, PERMISSIONS.CENTER.VIEW.action],
    // centerId will be set when creating roles for specific centers
  },
  {
    name: 'Staff',
    type: RoleType.USER,
    description: 'General staff member with limited access',
    permissions: [PERMISSIONS.USER.READ.action, PERMISSIONS.CENTER.VIEW.action],
    // centerId will be set when creating roles for specific centers
  },
];

// Helper function to create center-specific roles with faker
export const createCenterSpecificRoles = (
  centerId: string,
  centerName?: string,
): Partial<Role>[] => {
  return CENTER_ROLES.map((role) => {
    const baseName = role.name;
    const suffix = centerName || faker.company.name();
    const fullName = `${baseName} - ${suffix}`;

    return {
      ...role,
      centerId,
      name: fullName.length > 100 ? fullName.substring(0, 100) : fullName,
      description: `${role.description} for ${suffix}`,
    };
  });
};

// Helper function to get all role definitions
export const getAllRoleDefinitions = (
  centerIds: string[],
  centerNames?: string[],
): Partial<Role>[] => {
  const globalRoles = GLOBAL_ROLES;
  const centerSpecificRoles = centerIds.flatMap((centerId, index) =>
    createCenterSpecificRoles(centerId, centerNames?.[index]),
  );

  return [...globalRoles, ...centerSpecificRoles];
};

// Helper function to create additional random roles for variety
export const createRandomRoles = (
  centerIds: string[],
  count: number = 3,
): Partial<Role>[] => {
  const roleTypes = [RoleType.USER, RoleType.CENTER_ADMIN];
  const randomRoles: Partial<Role>[] = [];

  for (let i = 0; i < count; i++) {
    const centerId = faker.helpers.arrayElement(centerIds);
    const roleType = faker.helpers.arrayElement(roleTypes);
    const permissions = faker.helpers.arrayElements(
      ALL_PERMISSIONS.map((p) => p.action),
      { min: 2, max: 8 },
    );

    const jobTitle = faker.person.jobTitle();
    const companyName = faker.company.name();
    const roleName = `${jobTitle} - ${companyName}`;

    randomRoles.push({
      name: roleName.length > 100 ? roleName.substring(0, 100) : roleName,
      type: roleType,
      description: faker.lorem.sentence(),
      permissions,
      centerId,
    });
  }

  return randomRoles;
};
