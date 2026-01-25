import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Payment } from '../entities/payment.entity';
import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { PaymentStrategyFactory } from '../strategies/payment-strategy-factory';

export interface ExecutionResult {
  transactions: Transaction[];
  cashTransactions?: CashTransaction[];
}

@Injectable()
export class PaymentExecutorService {
  private readonly logger = new Logger(PaymentExecutorService.name);

  constructor(private readonly strategyFactory: PaymentStrategyFactory) {}

  /**
   * Execute payment operations based on payment method
   * Uses Strategy pattern to delegate to appropriate payment strategy
   */
  @Transactional()
  async executePayment(payment: Payment): Promise<ExecutionResult> {
    // Get appropriate strategy for payment method
    const strategy = this.strategyFactory.createStrategy(payment.paymentMethod);

    // Validate payment before execution
    await strategy.validate(payment);

    // Execute payment using strategy
    return await strategy.execute(payment);
  }
}
