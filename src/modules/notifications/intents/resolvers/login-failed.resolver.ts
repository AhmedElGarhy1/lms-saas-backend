import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../base/base-intent-resolver.abstract';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { IntentForNotification } from '../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../types/audience-id.types';
import { UserService } from '@/modules/user/services/user.service';

/**
 * Resolver for Login Failed notification intent
 * Fetches user info and builds template variables
 */
@Injectable()
export class LoginFailedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.LOGIN_FAILED>
{
  private readonly logger: Logger = new Logger(LoginFailedResolver.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.LOGIN_FAILED>,
    audience: AudienceIdForNotification<NotificationType.LOGIN_FAILED>,
  ) {
    const user = (await this.userService.findOne(intent.userId))!;
    const phone = user.getPhone();
    const locale = this.extractLocale(user);

    const templateVariables = {
      name: user.name,
    };

    const recipients: RecipientInfo[] = [
      {
        userId: user.id,
        profileId: null,
        profileType: null,
        phone,
        email: null,
        locale,
      },
    ];

    return {
      templateVariables,
      recipients,
    };
  }
}
