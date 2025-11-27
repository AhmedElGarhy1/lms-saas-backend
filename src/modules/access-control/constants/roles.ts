export enum DefaultRoles {
  SUPER_ADMIN = 't.roles.superAdmin.name',
  OWNER = 't.roles.owner.name',
  // STUDENT = 'Student',
  // TEACHER = 'Teacher',
  // PARENT = 'Parent',
}

export const createOwnerRoleData = (centerId: string) => ({
  name: 't.roles.owner.name',
  description: 't.roles.owner.description',
  rolePermissions: [],
  centerId: centerId,
  readOnly: true,
});
