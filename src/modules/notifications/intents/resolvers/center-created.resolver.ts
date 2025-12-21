import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../types/audience-id.types';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { UserService } from '@/modules/user/services/user.service';

/**
 * Resolver for CENTER_CREATED notification intent
 * Handles OWNER and ADMIN audiences
 */
@Injectable()
export class CenterCreatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.CENTER_CREATED>
{
  private readonly logger: Logger = new Logger(CenterCreatedResolver.name);

  constructor(
    private readonly centersRepository: CentersRepository,
    private readonly userService: UserService,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.CENTER_CREATED>,
    audience: AudienceIdForNotification<NotificationType.CENTER_CREATED>,
  ) {
    const templateVariables = {
      creatorName: '',
      centerName: '',
      ownerName: '',
    };

    return {
      templateVariables,
      recipients: [],
    };
  }
}
