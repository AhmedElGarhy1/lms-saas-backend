import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export interface RecipientQueryOptions {
  profileTypes?: ProfileType[];
  excludeUserIds?: string[];
  skipSelfUserId?: string;
}

