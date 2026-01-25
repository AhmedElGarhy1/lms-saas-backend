import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentExecutionStrategy } from './payment-execution-strategy.interface';
import { WalletPaymentStrategy } from './wallet-payment-strategy';
import { CashPaymentStrategy } from './cash-payment-strategy';

@Injectable()
export class PaymentStrategyFactory {
  constructor(
    private readonly walletStrategy: WalletPaymentStrategy,
    private readonly cashStrategy: CashPaymentStrategy,
  ) {}

  /**
   * Create appropriate payment execution strategy based on payment method
   */
  createStrategy(paymentMethod: PaymentMethod): PaymentExecutionStrategy {
    switch (paymentMethod) {
      case PaymentMethod.WALLET:
        return this.walletStrategy;
      case PaymentMethod.CASH:
        return this.cashStrategy;
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
  }
}
