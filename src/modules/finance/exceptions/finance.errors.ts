import {
  DomainException,
  BaseErrorHelpers,
} from '../../../shared/common/exceptions/domain.exception';
import { FinanceErrorCode } from '../enums/finance.codes';

/**
 * Finance-specific error helpers
 * Clean, simple, and maintainable error creation
 */
export class FinanceErrors extends BaseErrorHelpers {
  static walletNotFound(): DomainException {
    return this.createNoDetails(FinanceErrorCode.WALLET_NOT_FOUND);
  }

  static cashboxNotFound(): DomainException {
    return this.createNoDetails(FinanceErrorCode.CASHBOX_NOT_FOUND);
  }

  static paymentProviderDown(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_PROVIDER_DOWN);
  }

  static transactionFailed(): DomainException {
    return this.createNoDetails(FinanceErrorCode.TRANSACTION_FAILED);
  }

  // Transfer-specific errors
  static transferProfilesDifferentUsers(): DomainException {
    return this.createNoDetails(
      FinanceErrorCode.TRANSFER_PROFILES_DIFFERENT_USERS,
    );
  }

  static transferSameProfile(): DomainException {
    return this.createNoDetails(FinanceErrorCode.TRANSFER_SAME_PROFILE);
  }

  // Transaction-specific errors
  static transactionNotFound(): DomainException {
    return this.createNoDetails(FinanceErrorCode.TRANSACTION_NOT_FOUND);
  }

  static transactionAmountMismatch(
    actualAmount: number,
    expectedAmount: number,
  ): DomainException {
    return this.createWithDetails(
      FinanceErrorCode.TRANSACTION_AMOUNT_MISMATCH,
      {
        actualAmount,
        expectedAmount,
      },
    );
  }

  static transactionBalanceRequired(): DomainException {
    return this.createNoDetails(FinanceErrorCode.TRANSACTION_BALANCE_REQUIRED);
  }

  static cashTransactionNotFound(): DomainException {
    return this.createNoDetails(FinanceErrorCode.CASH_TRANSACTION_NOT_FOUND);
  }

  // Payment-specific errors
  static paymentReferenceInvalid(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_REFERENCE_INVALID);
  }

  static paymentNotCompleted(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_NOT_COMPLETED);
  }

  static paymentAlreadyCompleted(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_ALREADY_COMPLETED);
  }

  static invalidAmount(): DomainException {
    return this.createNoDetails(FinanceErrorCode.INVALID_PAYMENT_AMOUNT);
  }

  static paymentAlreadyRefunded(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_ALREADY_REFUNDED);
  }

  static paymentNotPending(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_NOT_PENDING);
  }

  static paymentCurrencyNotSupported(
    currency: string,
    gateway: string,
  ): DomainException {
    return this.createWithDetails(
      FinanceErrorCode.PAYMENT_CURRENCY_NOT_SUPPORTED,
      {
        currency,
        gateway,
      },
    );
  }

  // Specific payment processing errors
  static paymentServiceUnavailable(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_SERVICE_UNAVAILABLE);
  }

  static paymentSetupFailed(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_SETUP_FAILED);
  }

  static paymentProcessingFailed(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_PROCESSING_FAILED);
  }

  static paymentNotFoundByGatewayId(gatewayPaymentId: string): DomainException {
    return this.createWithDetails(
      FinanceErrorCode.PAYMENT_NOT_FOUND_BY_GATEWAY_ID,
      {
        gatewayPaymentId,
      },
    );
  }

  static paymentNotRefundable(
    paymentId: string,
    currentStatus: string,
  ): DomainException {
    return this.createWithDetails(FinanceErrorCode.PAYMENT_NOT_REFUNDABLE, {
      paymentId,
      currentStatus,
    });
  }

  static paymentNotExternal(paymentId: string): DomainException {
    return this.createWithDetails(FinanceErrorCode.PAYMENT_NOT_EXTERNAL, {
      paymentId,
    });
  }

  static refundAmountExceedsPayment(
    refundAmount: number | string,
    paymentAmount: number | string,
  ): DomainException {
    return this.createWithDetails(
      FinanceErrorCode.REFUND_AMOUNT_EXCEEDS_PAYMENT,
      {
        refundAmount,
        paymentAmount,
      },
    );
  }

  static paymentMissingGatewayId(paymentId: string): DomainException {
    return this.createWithDetails(FinanceErrorCode.PAYMENT_MISSING_GATEWAY_ID, {
      paymentId,
    });
  }

  static insufficientRefundBalance(
    refundAmount: number | string,
    availableBalance: number | string,
  ): DomainException {
    return this.createWithDetails(
      FinanceErrorCode.INSUFFICIENT_REFUND_BALANCE,
      {
        refundAmount,
        availableBalance,
      },
    );
  }

  static paymentStatusTransitionInvalid(
    currentStatus: string,
    targetStatus: string,
    validTransitions: string[],
  ): DomainException {
    return this.createWithDetails(
      FinanceErrorCode.PAYMENT_STATUS_TRANSITION_INVALID,
      {
        currentStatus,
        targetStatus,
        validTransitions,
      },
    );
  }

  static paymentOverrideDenied(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_OVERRIDE_DENIED);
  }

  static paymentOwnershipRequired(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_OWNERSHIP_REQUIRED);
  }

  static walletAccessDenied(): DomainException {
    return this.createNoDetails(FinanceErrorCode.WALLET_ACCESS_DENIED);
  }

  // Payment execution errors
  static paymentExecutionFailed(message?: string): DomainException {
    return this.createWithDetails(FinanceErrorCode.PAYMENT_EXECUTION_FAILED, {
      message: message || 'Payment execution failed',
    });
  }

  static invalidPaymentAmount(): DomainException {
    return this.createNoDetails(FinanceErrorCode.INVALID_PAYMENT_AMOUNT);
  }

  static invalidPaymentData(): DomainException {
    return this.createNoDetails(FinanceErrorCode.INVALID_PAYMENT_DATA);
  }

  static unsupportedPaymentMethod(): DomainException {
    return this.createNoDetails(FinanceErrorCode.UNSUPPORTED_PAYMENT_SOURCE);
  }

  static paymentAlreadyExists(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_ALREADY_EXISTS);
  }

  static insufficientWalletBalance(): DomainException {
    return this.createNoDetails(FinanceErrorCode.INSUFFICIENT_WALLET_BALANCE);
  }

  static insufficientCashBalance(
    currentBalance?: number,
    requiredAmount?: number,
  ): DomainException {
    return this.createWithDetails(FinanceErrorCode.INSUFFICIENT_CASH_BALANCE, {
      currentBalance,
      requiredAmount,
      balanceType: 'cash',
    });
  }

  static invalidCashPaymentConfiguration(): DomainException {
    return this.createNoDetails(
      FinanceErrorCode.INVALID_CASH_PAYMENT_CONFIGURATION,
    );
  }

  static paymentNotFound(): DomainException {
    return this.createNoDetails(FinanceErrorCode.PAYMENT_NOT_FOUND);
  }

  static invalidPaymentOperation(message?: string): DomainException {
    return this.createWithDetails(
      FinanceErrorCode.INVALID_PAYMENT_OPERATION,
      message,
    );
  }
}
