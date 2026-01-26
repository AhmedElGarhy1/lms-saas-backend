import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { TeacherPayoutErrorCode } from '../enums/teacher-payouts.codes';

/**
 * Teacher Payout module error helpers
 */
export class TeacherPayoutErrors extends BaseErrorHelpers {
  static payoutNotFound(): DomainException {
    return this.createNoDetails(TeacherPayoutErrorCode.PAYOUT_NOT_FOUND);
  }

  static payoutAlreadyPaid(): DomainException {
    return this.createNoDetails(TeacherPayoutErrorCode.PAYOUT_ALREADY_PAID);
  }

  static payoutInvalidStatusTransition(): DomainException {
    return this.createNoDetails(
      TeacherPayoutErrorCode.PAYOUT_INVALID_STATUS_TRANSITION,
    );
  }

  static payoutAlreadyExists(): DomainException {
    return this.createNoDetails(TeacherPayoutErrorCode.PAYOUT_ALREADY_EXISTS);
  }

  static invalidPayoutType(): DomainException {
    return this.createNoDetails(TeacherPayoutErrorCode.PAYOUT_INVALID_TYPE);
  }

  static payoutAmountExceedsRemaining(): DomainException {
    return this.createNoDetails(
      TeacherPayoutErrorCode.PAYOUT_AMOUNT_EXCEEDS_REMAINING,
    );
  }

  static invalidPayoutAmount(): DomainException {
    return this.createNoDetails(TeacherPayoutErrorCode.PAYOUT_INVALID_AMOUNT);
  }

  static payoutNotFoundForClass(classId: string): DomainException {
    return this.createWithDetails(
      TeacherPayoutErrorCode.PAYOUT_NOT_FOUND_FOR_CLASS,
      { classId },
    );
  }
}
