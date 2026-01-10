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
    return this.createNoDetails(
      StudentBillingErrorCode.SUBSCRIPTION_PAYMENT_STRATEGY_MISSING,
    );
  }

  static subscriptionAlreadyExists(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.SUBSCRIPTION_ALREADY_EXISTS,
    );
  }

  static subscriptionInvalidPaymentSource(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.SUBSCRIPTION_INVALID_PAYMENT_SOURCE,
    );
  }

  // Session charge errors
  static sessionChargePaymentStrategyMissing(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.SESSION_CHARGE_PAYMENT_STRATEGY_MISSING,
    );
  }

  static sessionChargeAlreadyExists(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.SESSION_CHARGE_ALREADY_EXISTS,
    );
  }

  static sessionChargeInvalidPaymentSource(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.SESSION_CHARGE_INVALID_PAYMENT_SOURCE,
    );
  }

  // Payment strategy validation errors
  static monthlySubscriptionsNotAllowed(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.MONTHLY_SUBSCRIPTIONS_NOT_ALLOWED,
    );
  }

  static sessionChargesNotAllowed(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.SESSION_CHARGES_NOT_ALLOWED,
    );
  }

  static sessionPaymentsNotConfigured(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.SESSION_PAYMENTS_NOT_CONFIGURED,
    );
  }

  static monthlyPaymentsNotConfigured(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.MONTHLY_PAYMENTS_NOT_CONFIGURED,
    );
  }

  // Class charge errors
  static classChargesNotAllowed(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.CLASS_CHARGES_NOT_ALLOWED,
    );
  }

  static classPaymentsNotConfigured(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.CLASS_PAYMENTS_NOT_CONFIGURED,
    );
  }

  static classChargeAlreadyExists(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.CLASS_CHARGE_ALREADY_EXISTS,
    );
  }

  // Refund errors
  static billingRecordNotFound(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.BILLING_RECORD_NOT_FOUND,
    );
  }

  static refundValidationFailed(billingType: string): DomainException {
    return this.createWithDetails(
      StudentBillingErrorCode.REFUND_VALIDATION_FAILED,
      { billingType },
    );
  }

  static alreadyRefunded(): DomainException {
    return this.createNoDetails(StudentBillingErrorCode.ALREADY_REFUNDED);
  }

  static refundFailed(reason: string): DomainException {
    return this.createWithDetails(
      StudentBillingErrorCode.REFUND_FAILED,
      reason,
    );
  }

  static refundUnsupportedPaymentType(paymentType: string): DomainException {
    return this.createWithDetails(
      StudentBillingErrorCode.REFUND_UNSUPPORTED_PAYMENT_TYPE,
      { paymentType },
    );
  }

  static refundPaymentNotFound(billingRecordId: string): DomainException {
    return this.createWithDetails(
      StudentBillingErrorCode.REFUND_PAYMENT_NOT_FOUND,
      { billingRecordId },
    );
  }

  // Installment payment errors
  static classChargeNotFound(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.CLASS_CHARGE_NOT_FOUND,
    );
  }

  static classAlreadyFullyPaid(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.CLASS_ALREADY_FULLY_PAID,
    );
  }

  static invalidChargeStatus(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.INVALID_CHARGE_STATUS,
    );
  }

  static paymentExceedsTotalAmount(): DomainException {
    return this.createNoDetails(
      StudentBillingErrorCode.PAYMENT_EXCEEDS_TOTAL_AMOUNT,
    );
  }
}
