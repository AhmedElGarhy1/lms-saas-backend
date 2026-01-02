export enum DefaultRoles {
  SUPER_ADMIN = 'Super Administrator',
  OWNER = 'Owner',
  // STUDENT = 'Student',
  // TEACHER = 'Teacher',
  // PARENT = 'Parent',
}

export const createOwnerRoleData = (centerId: string) => ({
  name: 'Owner',
  description: 'Owner role with elevated permissions',
  rolePermissions: [],
  centerId: centerId,
  readOnly: true,
});
