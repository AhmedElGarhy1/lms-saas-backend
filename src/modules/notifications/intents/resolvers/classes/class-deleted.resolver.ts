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
 * Resolver for CLASS_DELETED notification (OPERATIONAL)
 *
 * Note: Class is deleted, so we can't fetch class info
 * The event should include class name before deletion
 */
@Injectable()
export class ClassDeletedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.CLASS_DELETED>
{
  private readonly logger: Logger = new Logger(ClassDeletedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.CLASS_DELETED>,
    audience: AudienceIdForNotification<NotificationType.CLASS_DELETED>,
  ) {
    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(`CLASS_DELETED: Center not found: ${intent.centerId}`);
    }

    const actor = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actor ? await this.userService.findOne(actor.userId) : null;

    // Note: Class is deleted, className should come from event
    const templateVariables = {
      className: 'كلاس', // Fallback - ideally event includes className
      centerName: center.name,
      actorName: actorUser?.name || '',
    };

    const recipients: RecipientInfo[] = [];

    // Note: Since class is deleted, we can't fetch students/staff
    // The notification should be sent before deletion with cached recipients
    // For now, this resolver returns empty recipients as class is already deleted

    return { templateVariables, recipients };
  }
}
