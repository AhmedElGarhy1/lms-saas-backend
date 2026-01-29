import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { StudentChargesRepository } from '@/modules/student-billing/repositories/student-charges.repository';

/**
 * Resolver for CHARGE_INSTALLMENT_PAID notification
 *
 * Progress update – TARGET only (student). In-App only.
 */
@Injectable()
export class ChargeInstallmentPaidResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.CHARGE_INSTALLMENT_PAID>
{
  private readonly logger = new Logger(ChargeInstallmentPaidResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly chargesRepository: StudentChargesRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.CHARGE_INSTALLMENT_PAID>,
    audience: AudienceIdForNotification<NotificationType.CHARGE_INSTALLMENT_PAID>,
  ) {
    const charge = await this.chargesRepository.findStudentChargeWithFullRelations(
      intent.chargeId,
    );
    if (!charge) {
      throw new Error(
        `CHARGE_INSTALLMENT_PAID: Charge not found: ${intent.chargeId}`,
      );
    }

    const studentProfile = charge.student;
    if (!studentProfile) {
      throw new Error(
        `CHARGE_INSTALLMENT_PAID: Student profile not found for charge: ${intent.chargeId}`,
      );
    }

    const studentUser = await this.userService.findOne(studentProfile.userId);
    if (!studentUser) {
      throw new Error(
        `CHARGE_INSTALLMENT_PAID: Student user not found: ${studentProfile.userId}`,
      );
    }

    const actorProfile = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actorProfile
      ? await this.userService.findOne(actorProfile.userId)
      : null;
    const actorName = actorUser?.name ?? '';

    const installmentAmount = charge.lastPaymentAmount ?? 0;
    const remainingAmount = Math.max(
      0,
      Number(charge.amount) - Number(charge.totalPaid),
    );

    const templateVariables = {
      className: charge.class?.name ?? '',
      centerName: charge.center?.name ?? '',
      amount: String(charge.amount),
      chargeType: charge.chargeType,
      actorName,
      installmentAmount: String(installmentAmount),
      remainingAmount: String(remainingAmount),
    };

    const recipients: RecipientInfo[] = [];

    if (audience === 'TARGET') {
      recipients.push({
        userId: studentUser.id,
        profileId: studentProfile.id,
        profileType: studentProfile.profileType,
        phone: studentUser.getPhone(),
        email: null,
        locale: this.extractLocale(studentUser),
      });
    }

    return { templateVariables, recipients };
  }
}
