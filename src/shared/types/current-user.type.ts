import { User } from '@prisma/client';
import { RoleScopeEnum } from 'src/access-control/constants/role-scope.enum';

export interface CurrentUser extends User {
  userRoles?: { role?: { name: string } }[];
  centersOwned?: { id: string }[];
  centerId?: string; // current centerId
  scope: RoleScopeEnum;
}
