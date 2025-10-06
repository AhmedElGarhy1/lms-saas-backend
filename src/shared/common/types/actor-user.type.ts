import { User } from '@/modules/user/entities';

export type ActorUser = User & {
  centerId?: string;
  permissions: string[];
};
