import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';

/**
 * Resolver for USER_PROFILE_RESTORED notification
 * TARGET only. Push + In-App.
 */
@Injectable()
export class UserProfileRestoredResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.USER_PROFILE_RESTORED>
{
  private readonly logger = new Logger(UserProfileRestoredResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.USER_PROFILE_RESTORED>,
    audience: AudienceIdForNotification<NotificationType.USER_PROFILE_RESTORED>,
  ) {
    const profile = await this.userProfileService.findOne(
      intent.userProfileId,
    );
    if (!profile) {
      throw new Error(
        `USER_PROFILE_RESTORED: UserProfile not found: ${intent.userProfileId}`,
      );
    }

    const user = await this.userService.findOne(profile.userId);
    if (!user) {
      throw new Error(
        `USER_PROFILE_RESTORED: User not found: ${profile.userId}`,
      );
    }

    const actorProfile = await this.userProfileService.findOne(
      intent.actorId,
    );
    const actorUser = actorProfile
      ? await this.userService.findOne(actorProfile.userId)
      : null;
    const actorName = actorUser?.name ?? '';

    const templateVariables = { actorName };

    const recipients: RecipientInfo[] = [];
    if (audience === 'TARGET') {
      recipients.push({
        userId: user.id,
        profileId: profile.id,
        profileType: profile.profileType,
        phone: user.getPhone(),
        email: null,
        locale: this.extractLocale(user),
      });
    }

    return { templateVariables, recipients };
  }
}
