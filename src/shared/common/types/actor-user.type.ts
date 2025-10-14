import { User } from '@/modules/user/entities/user.entity';

export type ActorUser = User & {
  centerId?: string;
  permissions: string[];
};
