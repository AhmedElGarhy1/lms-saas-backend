import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Payment } from '../entities/payment.entity';
import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { CashTransactionService } from './cash-transaction.service';
import { CashboxService } from './cashbox.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import {
  CashTransactionDirection,
  CashTransactionType,
} from '../enums/cash-transaction-direction.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { randomUUID } from 'crypto';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';

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
  ) {}

  /**
   * Execute payment operations based on payment source
   */
  @Transactional()
  async executePayment(payment: Payment): Promise<ExecutionResult> {
    if (payment.paymentMethod === PaymentMethod.WALLET) {
      return await this.executeWalletPayment(payment);
    } else if (payment.paymentMethod === PaymentMethod.CASH) {
      return await this.executeCashPayment(payment);
    } else {
      throw new Error(`Unsupported payment method: ${payment.paymentMethod}`);
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

    // Validate sender wallet balance
    if (senderWallet.balance.lessThan(payment.amount)) {
      this.logger.error(
        `Insufficient balance for wallet payment: ${senderWallet.balance.toString()} < ${payment.amount.toString()}`,
      );
      throw FinanceErrors.insufficientWalletBalance();
    }

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
    // Determine cash operation based on branch position (sender vs receiver)
    if (payment.senderType === WalletOwnerType.BRANCH) {
      // Branch is sending money → Cash OUT from cashbox (withdrawal)
      const cashbox = await this.cashboxService.getCashbox(payment.senderId);

      // Validate cashbox balance
      if (cashbox.balance.lessThan(payment.amount)) {
        throw FinanceErrors.insufficientCashBalance();
      }

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

      return {
        transactions: [], // No transaction records for cash operations
        cashTransactions: [cashTransaction],
      };
    } else if (payment.receiverType === WalletOwnerType.BRANCH) {
      // Branch is receiving money → Cash IN to cashbox (deposit)
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

      return {
        transactions: [], // No transaction records for cash operations
        cashTransactions: [cashTransaction],
      };
    } else {
      // Handle other cash operations (not involving branches)
      return { transactions: [] };
    }
  }

  /**
   * Map payment reason to transaction type
   */
  private mapPaymentReasonToTransactionType(reason: string): TransactionType {
    switch (reason) {
      case PaymentReason.TOPUP:
        return TransactionType.TOPUP;
      case PaymentReason.BRANCH_WITHDRAWAL:
        return TransactionType.BRANCH_WITHDRAWAL;
      case PaymentReason.BRANCH_DEPOSIT:
        return TransactionType.BRANCH_DEPOSIT;
      case PaymentReason.INTERNAL_TRANSFER:
        return TransactionType.INTERNAL_TRANSFER;
      case PaymentReason.SESSION_FEE:
      case PaymentReason.MONTHLY_FEE:
      case PaymentReason.CLASS_FEE:
        return TransactionType.STUDENT_BILL;
      case PaymentReason.TEACHER_STUDENT_PAYOUT:
      case PaymentReason.TEACHER_HOUR_PAYOUT:
      case PaymentReason.TEACHER_SESSION_PAYOUT:
      case PaymentReason.TEACHER_MONTHLY_PAYOUT:
      case PaymentReason.TEACHER_CLASS_PAYOUT:
        return TransactionType.TEACHER_PAYOUT;
      default:
        return TransactionType.INTERNAL_TRANSFER;
    }
  }
}
