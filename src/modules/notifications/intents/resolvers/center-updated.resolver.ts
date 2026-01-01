import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../base/base-intent-resolver.abstract';
import { TemplateVariablesFor } from '../../types/template-variables.types';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { IntentForNotification } from '../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../types/audience-id.types';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { UserService } from '@/modules/user/services/user.service';

/**
 * Resolver for CENTER_UPDATED notification intent
 * Handles DEFAULT audience
 */
@Injectable()
export class CenterUpdatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.CENTER_UPDATED>
{
  private readonly logger: Logger = new Logger(CenterUpdatedResolver.name);

  constructor(
    private readonly centersRepository: CentersRepository,
    private readonly userService: UserService,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.CENTER_UPDATED>,
    audience: AudienceIdForNotification<NotificationType.CENTER_UPDATED>,
  ) {
    // Fetch center
    const center = await this.centersRepository.findOneOrThrow(intent.centerId);

    // Fetch actor/user
    const actor = (await this.userService.findOne(intent.actorId))!;

    const phone = actor.getPhone();

    const locale = this.extractLocale(actor);

    const templateVariables = {
      centerName: center.name,
    };

    const recipients: RecipientInfo[] = [
      {
        userId: actor.id || '',
        profileId: null,
        profileType: null,
        phone,
        email: null,
        locale,
        centerId: center.id,
      },
    ];

    return {
      templateVariables,
      recipients,
    };
  }
}
