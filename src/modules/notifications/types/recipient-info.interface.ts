import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export interface RecipientInfo {
  userId: string;
  profileId: string;
  email: string | null;
  phone: string; // Required - users must have phone
  profileType: ProfileType;
}
