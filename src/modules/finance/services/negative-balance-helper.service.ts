import { Injectable } from '@nestjs/common';
import { Payment } from '../entities/payment.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { Money } from '@/shared/common/utils/money.util';
import { SettingsService } from '@/modules/settings/services/settings.service';
import { hasFeeAmount } from '../utils/payment-type-helpers.util';

@Injectable()
export class NegativeBalanceHelperService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Check if negative balance should be allowed for fee transactions
   * Negative balance is only allowed for fees from cash payments
   */
  shouldAllowNegativeForFees(payment: Payment): boolean {
    // Only payments with fees can have negative balance for fee transactions
    if (!hasFeeAmount(payment)) {
      return false;
    }

    // Only cash payments allow negative balance for fees
    return payment.paymentMethod === PaymentMethod.CASH;
  }

  /**
   * Get the maximum allowed negative balance for fee transactions
   * Returns undefined if negative balance is not allowed
   */
  async getAllowNegativeUpTo(payment: Payment): Promise<Money | undefined> {
    // Check if this payment has fees and is cash payment
    if (!this.shouldAllowNegativeForFees(payment)) {
      return undefined;
    }

    // Get maxNegativeBalance directly from global settings
    return await this.settingsService.getMaxNegativeBalance();
  }
}
