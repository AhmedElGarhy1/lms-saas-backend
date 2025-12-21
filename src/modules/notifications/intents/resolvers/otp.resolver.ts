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
 * Resolver for OTP notification intent
 * Template variables (otpCode, expiresIn) come from the intent itself
 * Handles DEFAULT audience
 */
@Injectable()
export class OtpResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.OTP>
{
  private readonly logger: Logger = new Logger(OtpResolver.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.OTP>,
    audience: AudienceIdForNotification<NotificationType.OTP>,
  ) {
    // Fetch user
    const user = (await this.userService.findOne(intent.userId))!;

    const phone = user.getPhone();

    const locale = this.extractLocale(user);

    const templateVariables = {
      otpCode: intent.otpCode,
      expiresIn: intent.expiresIn,
    };

    // Resolve recipients for DEFAULT audience
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
