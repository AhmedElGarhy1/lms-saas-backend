import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { TeacherPayoutRecordsRepository } from '@/modules/teacher-payouts/repositories/teacher-payout-records.repository';
import { Money } from '@/shared/common/utils/money.util';

/**
 * Resolver for PAYOUT_CREATED notification
 *
 * Record created – TARGET only (teacher). In-App only.
 */
@Injectable()
export class PayoutCreatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.PAYOUT_CREATED>
{
  private readonly logger = new Logger(PayoutCreatedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly payoutRepository: TeacherPayoutRecordsRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.PAYOUT_CREATED>,
    audience: AudienceIdForNotification<NotificationType.PAYOUT_CREATED>,
  ) {
    const payout =
      await this.payoutRepository.findTeacherPayoutWithFullRelations(
        intent.payoutId,
      );
    if (!payout) {
      throw new Error(
        `PAYOUT_CREATED: Payout not found: ${intent.payoutId}`,
      );
    }

    const teacherProfile = payout.teacher;
    if (!teacherProfile) {
      throw new Error(
        `PAYOUT_CREATED: Teacher profile not found for payout: ${intent.payoutId}`,
      );
    }

    const teacherUser = await this.userService.findOne(teacherProfile.userId);
    if (!teacherUser) {
      throw new Error(
        `PAYOUT_CREATED: Teacher user not found: ${teacherProfile.userId}`,
      );
    }

    const actorProfile = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actorProfile
      ? await this.userService.findOne(actorProfile.userId)
      : null;
    const actorName = actorUser?.name ?? '';

    const amount =
      payout.unitPrice != null
        ? String(payout.unitPrice)
        : (payout.totalPaid instanceof Money
            ? payout.totalPaid.toString()
            : String(payout.totalPaid));

    const templateVariables = {
      className: payout.class?.name ?? '',
      centerName: payout.center?.name ?? '',
      amount,
      unitType: payout.unitType,
      actorName,
    };

    const recipients: RecipientInfo[] = [];

    if (audience === 'TARGET') {
      recipients.push({
        userId: teacherUser.id,
        profileId: teacherProfile.id,
        profileType: teacherProfile.profileType,
        phone: teacherUser.getPhone(),
        email: null,
        locale: this.extractLocale(teacherUser),
      });
    }

    return { templateVariables, recipients };
  }
}
