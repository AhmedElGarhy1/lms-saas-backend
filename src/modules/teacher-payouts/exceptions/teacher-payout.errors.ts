import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { TeacherPayoutErrorCode } from '../enums/teacher-payout-error-codes';

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
    return this.createNoDetails(TeacherPayoutErrorCode.PAYOUT_INVALID_STATUS_TRANSITION);
  }

  static payoutAlreadyExists(): DomainException {
    return this.createNoDetails(TeacherPayoutErrorCode.PAYOUT_ALREADY_EXISTS);
  }
}
