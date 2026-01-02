import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { StudentBillingErrorCode } from '../enums/student-billing.codes';

/**
 * Student Billing module error helpers
 * Clean, simple, and maintainable error creation
 */
export class StudentBillingErrors extends BaseErrorHelpers {

  // Subscription errors
  static subscriptionPaymentStrategyMissing(): DomainException {
    return this.createNoDetails(StudentBillingErrorCode.SUBSCRIPTION_PAYMENT_STRATEGY_MISSING);
  }

  static subscriptionAlreadyExists(): DomainException {
    return this.createNoDetails(StudentBillingErrorCode.SUBSCRIPTION_ALREADY_EXISTS);
  }

  static subscriptionInvalidPaymentSource(): DomainException {
    return this.createNoDetails(StudentBillingErrorCode.SUBSCRIPTION_INVALID_PAYMENT_SOURCE);
  }

  // Session charge errors
  static sessionChargePaymentStrategyMissing(): DomainException {
    return this.createNoDetails(StudentBillingErrorCode.SESSION_CHARGE_PAYMENT_STRATEGY_MISSING);
  }

  static sessionChargeAlreadyExists(): DomainException {
    return this.createNoDetails(StudentBillingErrorCode.SESSION_CHARGE_ALREADY_EXISTS);
  }

  static sessionChargeInvalidPaymentSource(): DomainException {
    return this.createNoDetails(StudentBillingErrorCode.SESSION_CHARGE_INVALID_PAYMENT_SOURCE);
  }
}
