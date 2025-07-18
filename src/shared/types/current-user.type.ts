import { User } from '@prisma/client';

export interface CurrentUser extends User {
  userRoles?: { role?: { name: string } }[];
  centersOwned?: { id: string }[];
}
