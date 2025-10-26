export enum DefaultRoles {
  SUPER_ADMIN = 'Super Administrator',
  OWNER = 'Owner',
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  PARENT = 'Parent',
}

export const createOwnerRoleData = (centerId: string) => ({
  name: DefaultRoles.OWNER,
  description: 'Center Owner role',
  rolePermissions: [],
  centerId: centerId,
  readOnly: true,
});
