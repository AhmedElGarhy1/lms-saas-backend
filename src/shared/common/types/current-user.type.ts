import { User } from '@/modules/user/entities';

export interface CurrentUser extends User {
  centerId?: string;
  permissions: string[];
}
