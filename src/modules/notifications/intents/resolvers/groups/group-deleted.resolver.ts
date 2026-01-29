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
 * Resolver for GROUP_DELETED notification (OPERATIONAL)
 *
 * Note: Group is deleted, so we can't fetch group info
 * The event should include group/class name before deletion
 */
@Injectable()
export class GroupDeletedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.GROUP_DELETED>
{
  private readonly logger: Logger = new Logger(GroupDeletedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.GROUP_DELETED>,
    audience: AudienceIdForNotification<NotificationType.GROUP_DELETED>,
  ) {
    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(`GROUP_DELETED: Center not found: ${intent.centerId}`);
    }

    const actor = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actor ? await this.userService.findOne(actor.userId) : null;

    // Note: Group is deleted, names should come from event
    const templateVariables = {
      groupName: 'مجموعة', // Fallback
      className: 'كلاس', // Fallback
      centerName: center.name,
      actorName: actorUser?.name || '',
    };

    const recipients: RecipientInfo[] = [];

    // Note: Since group is deleted, we can't fetch students/staff
    // The notification should be sent before deletion with cached recipients
    // For now, this resolver returns empty recipients as group is already deleted

    return { templateVariables, recipients };
  }
}
