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
 * Resolver for STAFF_REMOVED_FROM_CLASS notification (OPERATIONAL)
 *
 * Staff needs to know removal - Push + In-App
 * Single audience: TARGET (the staff member being removed)
 */
@Injectable()
export class StaffRemovedFromClassResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.STAFF_REMOVED_FROM_CLASS>
{
  private readonly logger: Logger = new Logger(StaffRemovedFromClassResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.STAFF_REMOVED_FROM_CLASS>,
    audience: AudienceIdForNotification<NotificationType.STAFF_REMOVED_FROM_CLASS>,
  ) {
    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(
        `STAFF_REMOVED_FROM_CLASS: Center not found: ${intent.centerId}`,
      );
    }

    const staffProfile = await this.userProfileService.findOne(
      intent.staffUserProfileId,
    );
    if (!staffProfile) {
      throw new Error(
        `STAFF_REMOVED_FROM_CLASS: Staff profile not found: ${intent.staffUserProfileId}`,
      );
    }

    const staffUser = await this.userService.findOne(staffProfile.userId);
    if (!staffUser) {
      throw new Error(
        `STAFF_REMOVED_FROM_CLASS: Staff user not found: ${staffProfile.userId}`,
      );
    }

    const actor = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actor ? await this.userService.findOne(actor.userId) : null;

    const templateVariables = {
      staffName: staffUser.name,
      className: intent.className,
      centerName: center.name,
      actorName: actorUser?.name || '',
    };

    const recipients: RecipientInfo[] = [];

    if (audience === 'TARGET') {
      recipients.push({
        userId: staffUser.id,
        profileId: staffProfile.id,
        profileType: staffProfile.profileType,
        phone: staffUser.getPhone(),
        email: null,
        locale: this.extractLocale(staffUser),
      });
    }

    return { templateVariables, recipients };
  }
}
