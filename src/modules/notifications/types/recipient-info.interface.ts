import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export interface RecipientInfo {
  userId: string;
  profileId: string | null; // Can be null for auth events
  email: string | null;
  phone: string | null; // Can be null for email-only events
  profileType: ProfileType | null; // Can be null for auth events
}
