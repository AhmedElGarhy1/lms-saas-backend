import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';

/**
 * Resolver for USER_PROFILE_CREATED notification
 * TARGET only. In-App only.
 */
@Injectable()
export class UserProfileCreatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.USER_PROFILE_CREATED>
{
  private readonly logger = new Logger(UserProfileCreatedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.USER_PROFILE_CREATED>,
    audience: AudienceIdForNotification<NotificationType.USER_PROFILE_CREATED>,
  ) {
    const profile = await this.userProfileService.findOne(
      intent.userProfileId,
    );
    if (!profile) {
      throw new Error(
        `USER_PROFILE_CREATED: UserProfile not found: ${intent.userProfileId}`,
      );
    }

    const user = await this.userService.findOne(profile.userId);
    if (!user) {
      throw new Error(
        `USER_PROFILE_CREATED: User not found: ${profile.userId}`,
      );
    }

    const actorProfile = await this.userProfileService.findOne(
      intent.actorId,
    );
    const actorUser = actorProfile
      ? await this.userService.findOne(actorProfile.userId)
      : null;
    const actorName = actorUser?.name ?? '';

    let centerName = '';
    if (intent.centerId) {
      const center = await this.centersRepository.findOne(intent.centerId);
      centerName = center?.name ?? '';
    }

    const templateVariables = {
      actorName,
      profileType: profile.profileType,
      centerName,
    };

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
