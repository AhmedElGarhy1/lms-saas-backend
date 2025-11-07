import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export interface RecipientInfo {
  userId: string;
  profileId: string | null; // Can be null for auth events
  email: string | null;
  phone: string; // Required - always exists in user
  locale: string; // Required - from user.userInfo.locale
  centerId?: string | null; // Optional - only for center events
  profileType: ProfileType | null; // Can be null for auth events
}
