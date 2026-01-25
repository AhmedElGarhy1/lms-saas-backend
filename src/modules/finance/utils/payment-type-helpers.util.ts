import { Payment } from '../entities/payment.entity';
import { Money } from '@/shared/common/utils/money.util';

/**
 * Type guard to check if payment has valid fee amounts
 * Ensures both feeAmount and netAmount are defined
 */
export function hasFeeAmount(
  payment: Payment,
): payment is Payment & { feeAmount: Money; netAmount: Money } {
  return (
    payment.feeAmount !== null &&
    payment.feeAmount !== undefined &&
    payment.feeAmount instanceof Money &&
    !payment.feeAmount.isZero() &&
    payment.netAmount !== null &&
    payment.netAmount !== undefined &&
    payment.netAmount instanceof Money
  );
}

/**
 * Type-safe getter for fee amount
 * Returns null if fee amount is not set or invalid
 */
export function getFeeAmount(payment: Payment): Money | null {
  if (hasFeeAmount(payment)) {
    return payment.feeAmount;
  }
  return null;
}
