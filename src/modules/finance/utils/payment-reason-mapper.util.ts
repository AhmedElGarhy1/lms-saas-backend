import { PaymentReason } from '../enums/payment-reason.enum';
import { TransactionType } from '../enums/transaction-type.enum';

/**
 * Maps payment reason to transaction type
 * Centralized utility to avoid duplication across services
 */
export function mapPaymentReasonToTransactionType(
  reason: PaymentReason,
): TransactionType {
  switch (reason) {
    case PaymentReason.TOPUP:
      return TransactionType.TOPUP;
    case PaymentReason.BRANCH_WITHDRAWAL:
      return TransactionType.BRANCH_WITHDRAWAL;
    case PaymentReason.BRANCH_DEPOSIT:
      return TransactionType.BRANCH_DEPOSIT;
    case PaymentReason.SESSION_FEE:
    case PaymentReason.MONTHLY_FEE:
    case PaymentReason.CLASS_FEE:
      return TransactionType.STUDENT_BILL;
    case PaymentReason.TEACHER_STUDENT_PAYOUT:
    case PaymentReason.TEACHER_HOUR_PAYOUT:
    case PaymentReason.TEACHER_SESSION_PAYOUT:
    case PaymentReason.TEACHER_MONTHLY_PAYOUT:
    case PaymentReason.TEACHER_CLASS_PAYOUT:
      return TransactionType.TEACHER_PAYOUT;
    case PaymentReason.EXPENSE:
      return TransactionType.EXPENSE;
    case PaymentReason.INTERNAL_TRANSFER:
    default:
      return TransactionType.INTERNAL_TRANSFER;
  }
}
