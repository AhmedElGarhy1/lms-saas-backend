import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { FinanceErrors } from '../exceptions/finance.errors';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';
import { PaymentService } from './payment.service';
import { CashTransactionService } from './cash-transaction.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentRefundService {
  private readonly logger = new Logger(PaymentRefundService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly cashTransactionService: CashTransactionService,
  ) {}

  /**
   * Refund an internal payment
   * Reverses all transactions (main payment + fees) for the payment
   */
  @Transactional()
  async refundInternalPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw FinanceErrors.paymentNotCompleted();
    }

    // Reverse balances for internal payments
    if (payment.paymentMethod === PaymentMethod.WALLET) {
      await this.reverseWalletBalances(payment);
    } else if (payment.paymentMethod === PaymentMethod.CASH) {
      // For cash payments, reverse cash transaction and any fee wallet transactions
      const cashTransaction = await this.cashTransactionService.findByPaymentId(
        payment.id,
      );
      if (cashTransaction) {
        await this.cashTransactionService.reverseCashTransaction(
          cashTransaction.id,
        );
      }
      // Also reverse any fee wallet transactions (fees are wallet transactions even for cash payments)
      await this.reverseWalletBalances(payment);
    }

    // Mark payment as refunded
    payment.status = PaymentStatus.CANCELLED; // Using CANCELLED as refunded status
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Refund an external payment through gateway
   * Note: amount and reason parameters reserved for future gateway integration
   */
  @Transactional()
  async refundExternalPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw FinanceErrors.paymentNotCompleted();
    }

    if (!PaymentService.isAsyncPayment(payment)) {
      throw FinanceErrors.invalidPaymentOperation(
        'Can only refund external payments through gateway',
      );
    }

    // For now, just mark as refunded since gateway integration is pending
    // Gateway refunds not needed - users can withdraw from wallets instead
    payment.status = PaymentStatus.CANCELLED; // Mark as refunded
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Reverse wallet balances for internal payment refund
   * Reverses all transactions (main payment + fees) by finding all transactions for the payment
   */
  private async reverseWalletBalances(payment: Payment): Promise<void> {
    // Find all transactions for this payment (including fee transactions)
    const transactions = await this.transactionService.findByPaymentId(
      payment.id,
    );

    if (transactions.length === 0) {
      this.logger.warn(
        `No transactions found for payment ${payment.id} - skipping reversal`,
      );
      return;
    }

    // Reverse transactions in reverse order to maintain proper balance tracking
    // This ensures we reverse the most recent transactions first
    const reversedTransactions = [...transactions].reverse();
    const correlationId = randomUUID(); // New correlation ID for refund

    for (const transaction of reversedTransactions) {
      if (!transaction.fromWalletId || !transaction.toWalletId) {
        // Skip transactions without both wallets (shouldn't happen, but safety check)
        continue;
      }

      // Reverse: swap wallets and reverse amount
      // Original: fromWallet -> toWallet with amount
      // Reverse: toWallet -> fromWallet with -amount
      const reversedAmount = transaction.amount.multiply(-1);

      // Update wallet balances (reverse the transaction)
      const updatedFromWallet = await this.walletService.updateBalance(
        transaction.fromWalletId,
        transaction.amount, // Credit back (was debited, now credit)
      );

      const updatedToWallet = await this.walletService.updateBalance(
        transaction.toWalletId,
        reversedAmount, // Debit back (was credited, now debit)
      );

      // Create single reversal transaction (swapped wallets, reversed amount)
      await this.transactionService.createTransaction(
        transaction.toWalletId, // fromWalletId (original receiver giving back)
        transaction.fromWalletId, // toWalletId (original sender getting back)
        reversedAmount, // Negative amount (debit from original receiver)
        TransactionType.REFUND,
        correlationId,
        updatedToWallet.balance,
        payment.id,
      );

      // Create credit transaction for the reversal
      await this.transactionService.createTransaction(
        transaction.toWalletId, // fromWalletId (original receiver giving back)
        transaction.fromWalletId, // toWalletId (original sender getting back)
        transaction.amount, // Positive amount (credit to original sender)
        TransactionType.REFUND,
        correlationId,
        updatedFromWallet.balance,
        payment.id,
      );
    }

    this.logger.log(
      `Reversed ${transactions.length} transactions for payment ${payment.id}`,
    );
  }
}
