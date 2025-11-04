import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export interface RecipientInfo {
  userId: string;
  profileId: string;
  email: string;
  profileType: ProfileType;
}

