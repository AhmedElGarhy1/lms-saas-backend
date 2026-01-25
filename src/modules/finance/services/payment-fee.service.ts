import { Injectable } from '@nestjs/common';
import { PaymentReason } from '../enums/payment-reason.enum';
import { Money } from '@/shared/common/utils/money.util';
import { SettingsService } from '@/modules/settings/services/settings.service';

@Injectable()
export class PaymentFeeService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Check if fees should be applied to a payment reason
   * Fees are only applied to student payments
   */
  shouldApplyFee(paymentReason: PaymentReason): boolean {
    return (
      paymentReason === PaymentReason.SESSION_FEE ||
      paymentReason === PaymentReason.MONTHLY_FEE ||
      paymentReason === PaymentReason.CLASS_FEE
    );
  }

  /**
   * Calculate fee amount from total amount and fees percentage
   */
  calculateFee(amount: Money, feesPercentage: number): Money {
    if (feesPercentage <= 0) {
      return Money.zero();
    }

    const feeAmount = amount.multiply(feesPercentage / 100);
    return feeAmount.toCurrencyPrecision();
  }

  /**
   * Calculate both feeAmount and netAmount from total amount and fees percentage
   */
  calculateFeeAmounts(
    amount: Money,
    feesPercentage: number,
  ): { feeAmount: Money; netAmount: Money } {
    const feeAmount = this.calculateFee(amount, feesPercentage);
    const netAmount = amount.subtract(feeAmount).toCurrencyPrecision();

    return { feeAmount, netAmount };
  }

  /**
   * Get fees percentage from settings
   */
  async getFeesPercentage(): Promise<number> {
    return this.settingsService.getFees();
  }
}
