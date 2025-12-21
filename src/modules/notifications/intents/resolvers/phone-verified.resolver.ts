import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../base/base-intent-resolver.abstract';
import { TemplateVariablesFor } from '../../types/template-variables.types';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { IntentForNotification } from '../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../types/audience-id.types';
import { UserService } from '@/modules/user/services/user.service';

/**
 * Resolver for PHONE_VERIFIED notification intent
 * Handles DEFAULT audience
 */
@Injectable()
export class PhoneVerifiedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.PHONE_VERIFIED>
{
  private readonly logger: Logger = new Logger(PhoneVerifiedResolver.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.PHONE_VERIFIED>,
    audience: AudienceIdForNotification<NotificationType.PHONE_VERIFIED>,
  ) {
    // Fetch user
    const user = (await this.userService.findOne(intent.userId))!;

    const phone = user.getPhone();

    const locale = this.extractLocale(user);

    const recipients: RecipientInfo[] = [
      {
        userId: user.id,
        profileId: null,
        profileType: null,
        phone,
        email: null,
        locale,
        centerId: undefined,
      },
    ];

    return {
      templateVariables: {
        phone,
      },
      recipients,
    };
  }
}
