import { Injectable, Logger } from '@nestjs/common';
import { PaymentExecutionStrategy } from './payment-execution-strategy.interface';
import { Payment } from '../entities/payment.entity';
import { ExecutionResult } from '../services/payment-executor.service';
import { WalletService } from '../services/wallet.service';
import { TransactionService } from '../services/transaction.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import { mapPaymentReasonToTransactionType } from '../utils/payment-reason-mapper.util';
import { randomUUID } from 'crypto';
import { NegativeBalanceHelperService } from '../services/negative-balance-helper.service';
import { hasFeeAmount } from '../utils/payment-type-helpers.util';
import { TransactionType } from '../enums/transaction-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { SettingsService } from '@/modules/settings/services/settings.service';

@Injectable()
export class WalletPaymentStrategy implements PaymentExecutionStrategy {
  private readonly logger = new Logger(WalletPaymentStrategy.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly negativeBalanceHelper: NegativeBalanceHelperService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Validate wallet payment before execution
   */
  async validate(payment: Payment): Promise<void> {
    const senderWallet = await this.walletService.getWallet(
      payment.senderId,
      payment.senderType,
    );

    // For payments with fees, check if negative balance is allowed for fee transactions
    // (only applies to cash payments where center wallet may go negative for fees)
    const allowNegativeUpTo = hasFeeAmount(payment)
      ? await this.negativeBalanceHelper.getAllowNegativeUpTo(payment)
      : undefined;

    // If negative balance is not allowed, check sufficient balance
    if (!allowNegativeUpTo && senderWallet.balance.lessThan(payment.amount)) {
      this.logger.error(
        `Insufficient balance for wallet payment: ${senderWallet.balance.toString()} < ${payment.amount.toString()}`,
      );
      throw FinanceErrors.insufficientWalletBalance();
    }
  }

  /**
   * Execute wallet payment operations
   * If payment has fees, creates 4 transactions (main payment + fees)
   * Otherwise creates 2 transactions (standard payment)
   */
  async execute(payment: Payment): Promise<ExecutionResult> {
    // Get wallets
    const [senderWallet, receiverWallet] = await Promise.all([
      this.walletService.getWallet(payment.senderId, payment.senderType),
      this.walletService.getWallet(payment.receiverId, payment.receiverType),
    ]);

    const correlationId = payment.correlationId || randomUUID();
    const transactionType = mapPaymentReasonToTransactionType(payment.reason);

    // Check if payment has fees
    if (hasFeeAmount(payment)) {
      return await this.executePaymentWithFees(
        payment,
        senderWallet.id,
        receiverWallet.id,
        correlationId,
        transactionType,
      );
    }

    // Standard payment without fees - 2 transactions
    // Get negative balance allowance if applicable (shouldn't be needed for non-fee payments, but keep for safety)
    const allowNegativeUpTo =
      await this.negativeBalanceHelper.getAllowNegativeUpTo(payment);

    // Execute balance transfers: Move from sender's balance to receiver's balance
    const [updatedSenderWallet, updatedReceiverWallet] = await Promise.all([
      this.walletService.updateBalance(
        senderWallet.id,
        payment.amount.multiply(-1), // Debit sender
        undefined, // retryCount
        allowNegativeUpTo,
      ),
      this.walletService.updateBalance(receiverWallet.id, payment.amount), // Credit receiver
    ]);

    // Create transaction records
    const debitTransaction = await this.transactionService.createTransaction(
      senderWallet.id,
      receiverWallet.id,
      payment.amount.multiply(-1), // Negative for debit
      transactionType,
      correlationId,
      updatedSenderWallet.balance, // Use balance for sender
      payment.id,
    );

    const creditTransaction = await this.transactionService.createTransaction(
      senderWallet.id,
      receiverWallet.id,
      payment.amount, // Positive for credit
      transactionType,
      correlationId,
      updatedReceiverWallet.balance,
      payment.id,
    );

    return {
      transactions: [debitTransaction, creditTransaction],
    };
  }

  /**
   * Execute payment with fees - creates 4 transactions
   * 1. Debit student (full amount)
   * 2. Credit center (netAmount)
   * 3. Debit center (feeAmount)
   * 4. Credit system (feeAmount)
   * @throws Error if payment doesn't have fee amounts (should not happen if hasFeeAmount check passed)
   */
  private async executePaymentWithFees(
    payment: Payment,
    senderWalletId: string,
    receiverWalletId: string,
    correlationId: string,
    mainTransactionType: TransactionType,
  ): Promise<ExecutionResult> {
    // Type guard ensures feeAmount and netAmount are defined
    if (!hasFeeAmount(payment)) {
      throw new Error(
        'Payment must have fee amounts to execute payment with fees',
      );
    }

    // Get system wallet for fee transactions
    const systemWallet = await this.walletService.getSystemWallet();

    // Check if negative balance is allowed for fees (only for cash payments)
    // For wallet payments with fees, we check if the original payment method was CASH
    const allowNegativeUpTo =
      payment.paymentMethod === PaymentMethod.CASH
        ? await this.settingsService.getMaxNegativeBalance()
        : undefined;

    // Step 1: Debit student (full amount)
    const updatedSenderWallet = await this.walletService.updateBalance(
      senderWalletId,
      payment.amount.multiply(-1), // Debit full amount from student
    );

    // Step 2: Credit center (netAmount - what center actually receives)
    const updatedReceiverWallet = await this.walletService.updateBalance(
      receiverWalletId,
      payment.netAmount, // Credit netAmount to center
    );

    // Step 3: Debit center (feeAmount - may go negative for cash payments)
    const updatedReceiverWalletAfterFee =
      await this.walletService.updateBalance(
        receiverWalletId,
        payment.feeAmount.multiply(-1), // Debit fee from center
        undefined, // retryCount
        allowNegativeUpTo, // Allow negative balance for cash payments
      );

    // Step 4: Credit system (feeAmount)
    const updatedSystemWallet = await this.walletService.updateBalance(
      systemWallet.id,
      payment.feeAmount, // Credit fee to system
    );

    // Create all 4 transactions
    const transactions = await Promise.all([
      // 1. Debit student (full amount)
      this.transactionService.createTransaction(
        senderWalletId,
        receiverWalletId,
        payment.amount.multiply(-1), // Negative for debit
        mainTransactionType,
        correlationId,
        updatedSenderWallet.balance,
        payment.id,
      ),
      // 2. Credit center (netAmount)
      this.transactionService.createTransaction(
        senderWalletId,
        receiverWalletId,
        payment.netAmount, // Positive for credit (netAmount, not full amount)
        mainTransactionType,
        correlationId,
        updatedReceiverWallet.balance,
        payment.id,
      ),
      // 3. Debit center (feeAmount)
      this.transactionService.createTransaction(
        receiverWalletId,
        systemWallet.id,
        payment.feeAmount.multiply(-1), // Negative for debit
        TransactionType.SYSTEM_FEE,
        correlationId,
        updatedReceiverWalletAfterFee.balance,
        payment.id,
      ),
      // 4. Credit system (feeAmount)
      this.transactionService.createTransaction(
        receiverWalletId,
        systemWallet.id,
        payment.feeAmount, // Positive for credit
        TransactionType.SYSTEM_FEE,
        correlationId,
        updatedSystemWallet.balance,
        payment.id,
      ),
    ]);

    return {
      transactions,
    };
  }
}
