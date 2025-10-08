import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Role } from '../entities/roles/role.entity';
import { USER_PERMISSIONS } from './permissions';

export enum DefaultRoles {
  SUPER_ADMIN = 'Super Administrator',
  OWNER = 'Owner',
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  PARENT = 'Parent',
}

export const createDefaultCenterAdminRole = (
  centerId: string,
): Partial<Role> => ({
  name: 'Center Admin',
  type: RoleType.CENTER,
  description: 'Center Admin role',
  permissions: USER_PERMISSIONS.map((permission) => permission.action),
  centerId: centerId,
});
