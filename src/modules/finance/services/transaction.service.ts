import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../repositories/transaction.repository';
import { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { randomUUID } from 'crypto';

/**
 * @internal
 * TransactionService is for internal module use only.
 * Frontend should never call these methods directly.
 * Transactions are ledger entries created as side-effects of business operations.
 */
@Injectable()
export class TransactionService extends BaseService {
  constructor(private readonly transactionRepository: TransactionRepository) {
    super();
  }

  /**
   * Create a transaction record
   */
  @Transactional()
  async createTransaction(
    fromWalletId: string | null,
    toWalletId: string | null,
    amount: Money,
    type: TransactionType,
    correlationId?: string,
    balanceAfter?: Money,
  ): Promise<Transaction> {
    if (!balanceAfter) {
      throw new Error('balanceAfter is required for transaction integrity');
    }

    return this.transactionRepository.create({
      fromWalletId: fromWalletId || undefined,
      toWalletId: toWalletId || undefined,
      amount,
      type,
      correlationId: correlationId || randomUUID(),
      balanceAfter,
    });
  }

  /**
   * Create multiple transactions with same correlationId (for split payments)
   */
  @Transactional()
  async createSplitTransactions(
    transactions: Array<{
      fromWalletId?: string;
      toWalletId?: string;
      amount: Money;
      type: TransactionType;
      balanceAfter: Money; // Balance after this transaction
    }>,
    correlationId?: string,
  ): Promise<Transaction[]> {
    const sharedCorrelationId = correlationId || randomUUID();
    const createdTransactions: Transaction[] = [];

    for (const tx of transactions) {
      const transaction = await this.createTransaction(
        tx.fromWalletId || null,
        tx.toWalletId || null,
        tx.amount,
        tx.type,
        sharedCorrelationId,
        tx.balanceAfter, // Pass balance snapshot
      );
      createdTransactions.push(transaction);
    }

    return createdTransactions;
  }

  /**
   * Validate that sum of transactions with same correlationId equals payment amount
   */
  async validateCorrelationSum(
    correlationId: string,
    expectedAmount: Money,
  ): Promise<boolean> {
    const transactions =
      await this.transactionRepository.findByCorrelationId(correlationId);

    if (transactions.length === 0) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: 'No transactions found for correlation ID',
      } as never);
    }

    const total = transactions.reduce(
      (sum, tx) => sum.add(tx.amount),
      Money.zero(),
    );

    if (!total.equals(expectedAmount)) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: `Transaction sum ${total.toString()} does not match payment amount ${expectedAmount.toString()}`,
      } as never);
    }

    return true;
  }

  /**
   * Reverse a transaction (for cancellation)
   */
  @Transactional()
  async reverseTransaction(transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne(transactionId);

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // Create reverse transaction
    return this.createTransaction(
      transaction.toWalletId || null,
      transaction.fromWalletId || null,
      transaction.amount,
      transaction.type,
    );
  }

  /**
   * Find all transactions with same correlationId
   */
  async findByCorrelationId(correlationId: string): Promise<Transaction[]> {
    return this.transactionRepository.findByCorrelationId(correlationId);
  }

  /**
   * Check if transaction exists (for reference validation)
   */
  async transactionExists(transactionId: string): Promise<boolean> {
    const transaction = await this.transactionRepository.findOne(transactionId);
    return transaction !== null;
  }
}
