import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../base/base-intent-resolver.abstract';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { IntentForNotification } from '../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../types/audience-id.types';
import { UserService } from '@/modules/user/services/user.service';

/**
 * Resolver for New Device Login notification intent
 * Fetches user info and builds template variables with device name
 */
@Injectable()
export class NewDeviceLoginResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.NEW_DEVICE_LOGIN>
{
  private readonly logger: Logger = new Logger(NewDeviceLoginResolver.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.NEW_DEVICE_LOGIN>,
    audience: AudienceIdForNotification<NotificationType.NEW_DEVICE_LOGIN>,
  ) {
    const user = (await this.userService.findOne(intent.userId))!;
    const phone = user.getPhone();
    const locale = this.extractLocale(user);

    const templateVariables = {
      name: user.name,
      deviceName: intent.deviceName,
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
