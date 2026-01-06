export enum DefaultRoles {
  SUPER_ADMIN = 'Super Administrator',
  OWNER = 'Owner',
  // STUDENT = 'Student',
  // TEACHER = 'Teacher',
  // PARENT = 'Parent',
}

export const createOwnerRoleData = (centerId: string) => ({
  name: DefaultRoles.OWNER,
  description: 'Owner role with elevated permissions',
  rolePermissions: [],
  centerId: centerId,
  readOnly: true,
});
