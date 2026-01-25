import { Injectable, Logger } from '@nestjs/common';
import { PaymentExecutionStrategy } from './payment-execution-strategy.interface';
import { Payment } from '../entities/payment.entity';
import { Transaction } from '../entities/transaction.entity';
import { ExecutionResult } from '../services/payment-executor.service';
import { CashboxService } from '../services/cashbox.service';
import { CashTransactionService } from '../services/cash-transaction.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import {
  CashTransactionDirection,
  CashTransactionType,
} from '../enums/cash-transaction-direction.enum';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { hasFeeAmount } from '../utils/payment-type-helpers.util';
import { WalletService } from '../services/wallet.service';
import { TransactionService } from '../services/transaction.service';
import { TransactionType } from '../enums/transaction-type.enum';
import { SettingsService } from '@/modules/settings/services/settings.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CashPaymentStrategy implements PaymentExecutionStrategy {
  private readonly logger = new Logger(CashPaymentStrategy.name);

  constructor(
    private readonly cashboxService: CashboxService,
    private readonly cashTransactionService: CashTransactionService,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Validate cash payment before execution
   */
  async validate(payment: Payment): Promise<void> {
    // For cash withdrawals (branch sending), validate cashbox balance
    if (payment.senderType === WalletOwnerType.BRANCH) {
      const cashbox = await this.cashboxService.getCashbox(payment.senderId);
      if (cashbox.balance.lessThan(payment.amount)) {
        throw FinanceErrors.insufficientCashBalance();
      }
    }
    // For cash deposits (branch receiving), no validation needed
  }

  /**
   * Execute cash payment operations
   */
  async execute(payment: Payment): Promise<ExecutionResult> {
    // Determine cash operation based on branch position (sender vs receiver)
    if (payment.senderType === WalletOwnerType.BRANCH) {
      return await this.executeCashWithdrawal(payment);
    } else if (payment.receiverType === WalletOwnerType.BRANCH) {
      return await this.executeCashDeposit(payment);
    } else {
      // Handle other cash operations (not involving branches)
      return { transactions: [] };
    }
  }

  /**
   * Execute cash withdrawal (branch sending money)
   */
  private async executeCashWithdrawal(
    payment: Payment,
  ): Promise<ExecutionResult> {
    const cashbox = await this.cashboxService.getCashbox(payment.senderId);

    // Update cashbox balance (decrease - cash is taken out)
    const updatedCashbox = await this.cashboxService.updateBalance(
      cashbox.id,
      payment.amount.multiply(-1), // Debit cashbox
    );

    // Create cash transaction (OUT from cashbox)
    const cashTransaction =
      await this.cashTransactionService.createCashTransaction(
        payment.senderId, // branchId
        cashbox.id,
        payment.amount,
        CashTransactionDirection.OUT,
        payment.receiverId, // receivedBy (staff)
        CashTransactionType.BRANCH_WITHDRAWAL,
        payment.receiverId, // paidBy (staff taking cash)
        payment.id,
        updatedCashbox.balance, // Pass the updated balance
      );

    const result: ExecutionResult = {
      transactions: [], // No transaction records for cash operations
      cashTransactions: [cashTransaction],
    };

    // If payment has fees, create fee wallet transactions (fees are always wallet-to-wallet)
    if (hasFeeAmount(payment)) {
      const feeTransactions = await this.createFeeTransactions(payment);
      result.transactions = feeTransactions;
    }

    return result;
  }

  /**
   * Execute cash deposit (branch receiving money)
   */
  private async executeCashDeposit(payment: Payment): Promise<ExecutionResult> {
    const cashbox = await this.cashboxService.getCashbox(payment.receiverId);

    // Update cashbox balance (increase - cash is added)
    const updatedCashbox = await this.cashboxService.updateBalance(
      cashbox.id,
      payment.amount, // Credit cashbox
    );

    // Create cash transaction (IN to cashbox)
    const cashTransaction =
      await this.cashTransactionService.createCashTransaction(
        payment.receiverId, // branchId
        cashbox.id,
        payment.amount,
        CashTransactionDirection.IN,
        payment.senderId, // receivedBy (staff depositing)
        CashTransactionType.BRANCH_DEPOSIT,
        payment.senderId, // paidBy (staff depositing)
        payment.id,
        updatedCashbox.balance, // Pass the updated balance
      );

    this.logger.log(`Cashbox operation completed for payment ${payment.id}`);

    const result: ExecutionResult = {
      transactions: [], // No transaction records for cash operations
      cashTransactions: [cashTransaction],
    };

    // If payment has fees, create fee wallet transactions (fees are always wallet-to-wallet)
    if (hasFeeAmount(payment)) {
      const feeTransactions = await this.createFeeTransactions(payment);
      result.transactions = feeTransactions;
    }

    return result;
  }

  /**
   * Create fee wallet transactions for cash payments
   * Fees are wallet transactions (center wallet → system wallet) even for cash payments
   */
  private async createFeeTransactions(
    payment: Payment,
  ): Promise<Transaction[]> {
    // Get center wallet (receiver) and system wallet
    const [centerWallet, systemWallet] = await Promise.all([
      this.walletService.getWallet(payment.receiverId, payment.receiverType),
      this.walletService.getSystemWallet(),
    ]);

    // Get max negative balance for cash payment fees
    const maxNegativeBalance =
      await this.settingsService.getMaxNegativeBalance();

    // Debit center (feeAmount) - may go negative for cash payments
    const updatedCenterWallet = await this.walletService.updateBalance(
      centerWallet.id,
      payment.feeAmount.multiply(-1), // Debit fee from center
      undefined, // retryCount
      maxNegativeBalance, // Allow negative balance for cash payment fees
    );

    // Credit system (feeAmount)
    const updatedSystemWallet = await this.walletService.updateBalance(
      systemWallet.id,
      payment.feeAmount, // Credit fee to system
    );

    const correlationId = payment.correlationId || randomUUID();

    // Create fee transactions
    const feeTransactions = await Promise.all([
      // Debit center (feeAmount)
      this.transactionService.createTransaction(
        centerWallet.id,
        systemWallet.id,
        payment.feeAmount.multiply(-1), // Negative for debit
        TransactionType.SYSTEM_FEE,
        correlationId,
        updatedCenterWallet.balance,
        payment.id,
      ),
      // Credit system (feeAmount)
      this.transactionService.createTransaction(
        centerWallet.id,
        systemWallet.id,
        payment.feeAmount, // Positive for credit
        TransactionType.SYSTEM_FEE,
        correlationId,
        updatedSystemWallet.balance,
        payment.id,
      ),
    ]);

    return feeTransactions;
  }
}
