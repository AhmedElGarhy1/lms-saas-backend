import { Injectable } from '@nestjs/common';
import { CashTransactionRepository } from '../repositories/cash-transaction.repository';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { CashTransactionDirection } from '../enums/cash-transaction-direction.enum';
import { CashTransactionType } from '../enums/cash-transaction-direction.enum';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import { Transactional } from '@nestjs-cls/transactional';
import { FinanceErrors } from '../exceptions/finance.errors';
import { CashboxRepository } from '../repositories/cashbox.repository';

@Injectable()
export class CashTransactionService extends BaseService {
  constructor(
    private readonly cashTransactionRepository: CashTransactionRepository,
    private readonly cashboxRepository: CashboxRepository,
  ) {
    super();
  }

  /**
   * Create a cash transaction record
   */
  @Transactional()
  async createCashTransaction(
    branchId: string,
    cashboxId: string,
    amount: Money,
    direction: CashTransactionDirection,
    receivedByProfileId: string,
    type: CashTransactionType,
    paidByProfileId: string | undefined,
    paymentId?: string,
    balanceAfter?: Money,
  ): Promise<CashTransaction> {
    let finalBalanceAfter: Money;

    if (balanceAfter !== undefined) {
      // Use provided balanceAfter (already calculated by caller)
      finalBalanceAfter = balanceAfter;
    } else {
      // Calculate balance after this transaction (legacy behavior)
      const cashbox = await this.cashboxRepository.findOneOrThrow(cashboxId);
      const currentBalance = cashbox.balance;
      finalBalanceAfter =
        direction === CashTransactionDirection.IN
          ? currentBalance.add(amount)
          : currentBalance.subtract(amount);
    }

    return this.cashTransactionRepository.create({
      paymentId,
      branchId,
      cashboxId,
      amount,
      balanceAfter: finalBalanceAfter,
      direction,
      receivedByProfileId,
      paidByProfileId,
      type,
    });
  }

  /**
   * Reverse a cash transaction (for cancellation)
   */
  @Transactional()
  async reverseCashTransaction(
    cashTransactionId: string,
  ): Promise<CashTransaction> {
    const cashTransaction =
      await this.cashTransactionRepository.findOne(cashTransactionId);

    if (!cashTransaction) {
      throw FinanceErrors.cashTransactionNotFound();
    }

    // Create reverse transaction with opposite direction
    const reverseDirection =
      cashTransaction.direction === CashTransactionDirection.IN
        ? CashTransactionDirection.OUT
        : CashTransactionDirection.IN;

    return this.createCashTransaction(
      cashTransaction.branchId,
      cashTransaction.cashboxId,
      cashTransaction.amount,
      reverseDirection,
      cashTransaction.receivedByProfileId,
      cashTransaction.type,
      cashTransaction.paidByProfileId,
    );
  }

  /**
   * Check if cash transaction exists (for reference validation)
   */
  async cashTransactionExists(cashTransactionId: string): Promise<boolean> {
    const cashTransaction =
      await this.cashTransactionRepository.findOne(cashTransactionId);
    return cashTransaction !== null;
  }

  /**
   * Find cash transaction by payment ID
   */
  async findByPaymentId(paymentId: string): Promise<CashTransaction | null> {
    return this.cashTransactionRepository.findByPaymentId(paymentId);
  }
}
