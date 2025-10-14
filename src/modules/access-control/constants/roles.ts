import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Role } from '../entities/role.entity';

export enum DefaultRoles {
  SUPER_ADMIN = 'Super Administrator',
  OWNER = 'Owner',
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  PARENT = 'Parent',
}

export const createOwnerRoleData = (centerId: string) => ({
  name: DefaultRoles.OWNER,
  type: RoleType.CENTER,
  description: 'Center Owner role',
  permissions: [],
  centerId: centerId,
});
