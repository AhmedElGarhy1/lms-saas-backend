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
import { CashboxService } from './cashbox.service';

@Injectable()
export class CashTransactionService extends BaseService {
  constructor(
    private readonly cashTransactionRepository: CashTransactionRepository,
    private readonly cashboxRepository: CashboxRepository,
    private readonly cashboxService: CashboxService,
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
   * Reverse a cash transaction (for cancellation/refund)
   * This will reverse the direction and update the cashbox balance accordingly
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

    // Update cashbox balance based on reverse direction
    // If original was OUT (money went out), reverse is IN (money comes back)
    // If original was IN (money came in), reverse is OUT (money goes out)
    const balanceChange =
      reverseDirection === CashTransactionDirection.IN
        ? cashTransaction.amount // Add money back to cashbox
        : cashTransaction.amount.multiply(-1); // Remove money from cashbox

    const updatedCashbox = await this.cashboxService.updateBalance(
      cashTransaction.cashboxId,
      balanceChange,
    );

    // Create reverse transaction with updated balance
    return this.createCashTransaction(
      cashTransaction.branchId,
      cashTransaction.cashboxId,
      cashTransaction.amount,
      reverseDirection,
      cashTransaction.receivedByProfileId,
      cashTransaction.type,
      cashTransaction.paidByProfileId,
      cashTransaction.paymentId, // Pass the original paymentId for the reverse transaction
      updatedCashbox.balance, // Pass the updated balance after reversal
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
