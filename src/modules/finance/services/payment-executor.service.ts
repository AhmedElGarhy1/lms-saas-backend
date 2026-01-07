import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Payment } from '../entities/payment.entity';
import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { PaymentSource } from '../enums/payment-source.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { CashTransactionService } from './cash-transaction.service';
import { CashboxService } from './cashbox.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import { CashTransactionDirection } from '../enums/cash-transaction-direction.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { randomUUID } from 'crypto';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';

export interface ExecutionResult {
  transactions: Transaction[];
  cashTransactions?: CashTransaction[];
}

@Injectable()
export class PaymentExecutorService {
  private readonly logger = new Logger(PaymentExecutorService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly cashTransactionService: CashTransactionService,
    private readonly cashboxService: CashboxService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  /**
   * Execute payment operations based on payment source
   */
  @Transactional()
  async executePayment(payment: Payment): Promise<ExecutionResult> {
    if (payment.source === PaymentSource.WALLET) {
      return await this.executeWalletPayment(payment);
    } else if (payment.source === PaymentSource.CASH) {
      return await this.executeCashPayment(payment);
    } else {
      throw new Error(`Unsupported payment source: ${payment.source}`);
    }
  }

  /**
   * Execute wallet payment operations
   */
  private async executeWalletPayment(
    payment: Payment,
  ): Promise<ExecutionResult> {
    // Get wallets
    const [senderWallet, receiverWallet] = await Promise.all([
      this.walletService.getWallet(payment.senderId, payment.senderType),
      this.walletService.getWallet(payment.receiverId, payment.receiverType),
    ]);

    // Execute balance transfers: Move from sender's balance to receiver's balance
    const [updatedSenderWallet, updatedReceiverWallet] = await Promise.all([
      this.walletService.updateBalance(
        senderWallet.id,
        payment.amount.multiply(-1), // Debit sender
      ),
      this.walletService.updateBalance(receiverWallet.id, payment.amount), // Credit receiver
    ]);

    // Create transaction records
    const correlationId = payment.correlationId || randomUUID();

    const debitTransaction = await this.transactionService.createTransaction(
      senderWallet.id,
      receiverWallet.id,
      payment.amount.multiply(-1), // Negative for debit
      this.mapPaymentReasonToTransactionType(payment.reason),
      correlationId,
      updatedSenderWallet.balance, // Use balance for sender
      payment.id,
    );

    const creditTransaction = await this.transactionService.createTransaction(
      senderWallet.id,
      receiverWallet.id,
      payment.amount, // Positive for credit
      this.mapPaymentReasonToTransactionType(payment.reason),
      correlationId,
      updatedReceiverWallet.balance,
      payment.id,
    );

    return {
      transactions: [debitTransaction, creditTransaction],
    };
  }

  /**
   * Execute cash payment operations
   */
  private async executeCashPayment(payment: Payment): Promise<ExecutionResult> {
    const metadata = payment.metadata || {};

    if (metadata.withdrawalType === 'cashbox') {
      return await this.executeCashboxWithdrawal(payment);
    } else if (metadata.depositType === 'cashbox') {
      return await this.executeCashboxDeposit(payment);
    } else if (metadata.depositType === 'wallet') {
      return await this.executeWalletDeposit(payment);
    } else {
      // Handle other cash operations (student billing, etc.)
      return { transactions: [] };
    }
  }

  /**
   * Execute cashbox withdrawal: Branch cashbox → Staff wallet
   */
  private async executeCashboxWithdrawal(
    payment: Payment,
  ): Promise<ExecutionResult> {
    // Get cashbox for the branch
    const cashbox = await this.cashboxService.getCashbox(payment.senderId);

    // Validate cashbox balance
    if (cashbox.balance.lessThan(payment.amount)) {
      throw FinanceErrors.insufficientCashBalance();
    }

    // Get/create receiver wallet
    const receiverWallet = await this.walletService.getWallet(
      payment.receiverId,
      payment.receiverType,
    );

    // Update balances
    const updatedCashbox = await this.cashboxService.updateBalance(
      cashbox.id,
      payment.amount.multiply(-1), // Debit cashbox
    );
    const updatedReceiverWallet = await this.walletService.updateBalance(
      receiverWallet.id,
      payment.amount, // Credit receiver wallet
    );

    // Create cash transaction (OUT from cashbox)
    const cashTransaction =
      await this.cashTransactionService.createCashTransaction(
        payment.senderId, // branchId
        cashbox.id,
        payment.amount,
        CashTransactionDirection.OUT,
        payment.receiverId, // receivedBy (staff)
        TransactionType.CASH_WITHDRAWAL,
        payment.receiverId, // paidBy (staff taking cash)
        payment.id,
      );

    // Create wallet transaction (credit to staff wallet)
    const walletTransaction = await this.transactionService.createTransaction(
      null, // fromWalletId (cash withdrawal)
      receiverWallet.id, // toWalletId
      payment.amount, // positive for credit
      TransactionType.CASH_WITHDRAWAL,
      payment.correlationId || randomUUID(),
      updatedReceiverWallet.balance,
      payment.id,
    );

    return {
      transactions: [walletTransaction],
      cashTransactions: [cashTransaction],
    };
  }

  /**
   * Execute wallet deposit: Staff wallet → Branch wallet
   */
  private async executeWalletDeposit(
    payment: Payment,
  ): Promise<ExecutionResult> {
    // Get sender wallet (staff)
    const senderWallet = await this.walletService.getWallet(
      payment.senderId,
      payment.senderType,
    );

    // Validate sender wallet balance
    if (senderWallet.balance.lessThan(payment.amount)) {
      this.logger.error(
        `Insufficient balance for wallet deposit: ${senderWallet.balance.toString()} < ${payment.amount.toString()}`,
      );
      throw FinanceErrors.insufficientWalletBalance();
    }

    // Get receiver wallet (branch)
    const receiverWallet = await this.walletService.getWallet(
      payment.receiverId,
      payment.receiverType,
    );

    // Update balances
    const updatedSenderWallet = await this.walletService.updateBalance(
      senderWallet.id,
      payment.amount.multiply(-1), // Debit sender wallet
    );

    const updatedReceiverWallet = await this.walletService.updateBalance(
      receiverWallet.id,
      payment.amount, // Credit receiver wallet
    );

    // Create transaction records
    const correlationId = payment.correlationId || randomUUID();

    const debitTransaction = await this.transactionService.createTransaction(
      senderWallet.id, // fromWalletId
      receiverWallet.id, // toWalletId
      payment.amount.multiply(-1), // Negative for debit
      this.mapPaymentReasonToTransactionType(payment.reason),
      correlationId,
      updatedSenderWallet.balance,
      payment.id,
    );

    const creditTransaction = await this.transactionService.createTransaction(
      senderWallet.id, // fromWalletId
      receiverWallet.id, // toWalletId
      payment.amount, // Positive for credit
      this.mapPaymentReasonToTransactionType(payment.reason),
      correlationId,
      updatedReceiverWallet.balance,
      payment.id,
    );

    this.logger.log(`Wallet deposit completed for payment ${payment.id}`);

    return {
      transactions: [debitTransaction, creditTransaction],
    };
  }

  /**
   * Execute cashbox deposit: Staff wallet → Branch cashbox
   */
  private async executeCashboxDeposit(
    payment: Payment,
  ): Promise<ExecutionResult> {
    // Get sender wallet
    const senderWallet = await this.walletService.getWallet(
      payment.senderId,
      payment.senderType,
    );

    // Validate sender wallet balance
    if (senderWallet.balance.lessThan(payment.amount)) {
      throw FinanceErrors.insufficientWalletBalance();
    }

    // Get cashbox for the branch
    const cashbox = await this.cashboxService.getCashbox(payment.receiverId);

    // Update balances
    const updatedSenderWallet = await this.walletService.updateBalance(
      senderWallet.id,
      payment.amount.multiply(-1), // Debit sender wallet
    );
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
        TransactionType.CASH_DEPOSIT,
        payment.senderId, // paidBy (staff depositing)
        payment.id,
      );

    // Create wallet transaction (debit from staff wallet)
    const walletTransaction = await this.transactionService.createTransaction(
      senderWallet.id, // fromWalletId
      null, // toWalletId (cash deposit)
      payment.amount.multiply(-1), // negative for debit
      TransactionType.CASH_DEPOSIT,
      payment.correlationId || randomUUID(),
      updatedSenderWallet.balance,
      payment.id,
    );

    this.logger.log(`Cashbox deposit completed for payment ${payment.id}`);

    return {
      transactions: [walletTransaction],
      cashTransactions: [cashTransaction],
    };
  }

  /**
   * Map payment reason to transaction type
   */
  private mapPaymentReasonToTransactionType(reason: string): TransactionType {
    switch (reason) {
      case PaymentReason.TOPUP:
        return TransactionType.TOPUP;
      case PaymentReason.WITHDRAWAL:
      case PaymentReason.DEPOSIT:
      case PaymentReason.INTERNAL_TRANSFER:
      default:
        return TransactionType.INTERNAL_TRANSFER;
    }
  }
}
