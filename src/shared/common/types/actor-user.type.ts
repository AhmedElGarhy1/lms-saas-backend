import { User } from '@/modules/user/entities/user.entity';
import { ProfileType } from '../enums/profile-type.enum';

export type ActorUser = User & {
  centerId?: string;
  profileId: string;
  profileType: ProfileType;
};
