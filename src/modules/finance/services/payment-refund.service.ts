import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Payment } from '../entities/payment.entity';
import { PaymentType } from '../enums/payment-type.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { FinanceErrors } from '../exceptions/finance.errors';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';
import {
  RefundPaymentRequest,
  RefundPaymentResponse,
} from '../adapters/interfaces/payment-gateway.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentRefundService {
  private readonly logger = new Logger(PaymentRefundService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  /**
   * Refund an internal payment
   */
  @Transactional()
  async refundInternalPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw FinanceErrors.paymentNotCompleted();
    }

    // Reverse balances for internal payments
    if (payment.source === PaymentMethod.WALLET) {
      await this.reverseWalletBalances(payment);
    }

    // Mark payment as refunded
    payment.status = PaymentStatus.CANCELLED; // Using CANCELLED as refunded status
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Refund an external payment through gateway
   */
  @Transactional()
  async refundExternalPayment(
    paymentId: string,
    amount: Money,
    reason?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw FinanceErrors.paymentNotCompleted();
    }

    if (payment.type !== PaymentType.EXTERNAL) {
      throw FinanceErrors.invalidPaymentOperation('Can only refund external payments through gateway');
    }

    // For now, just mark as refunded since gateway integration is pending
    // TODO: Implement proper gateway refund when gateway is integrated
    payment.status = PaymentStatus.CANCELLED; // Mark as refunded
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Reverse wallet balances for internal payment refund
   */
  private async reverseWalletBalances(payment: Payment): Promise<void> {
    const senderWallet = await this.walletService.getWallet(
      payment.senderId,
      payment.senderType,
    );
    const updatedSenderWallet = await this.walletService.updateBalance(
      senderWallet.id,
      payment.amount, // Credit back to sender
    );

    // Get receiver wallet and reverse the amount
    const receiverWallet = await this.walletService.getWallet(
      payment.receiverId,
      payment.receiverType as WalletOwnerType,
    );
    const updatedReceiverWallet = await this.walletService.updateBalance(
      receiverWallet.id,
      payment.amount.multiply(-1), // Debit from receiver
    );

    // Create reversal transactions for audit trail
    const correlationId = payment.correlationId || randomUUID();

    // Transaction for original receiver (now giving back money)
    await this.transactionService.createTransaction(
      payment.receiverId, // fromWalletId (receiver giving back)
      payment.senderId, // toWalletId (payer getting back)
      payment.amount.multiply(-1), // Negative amount (debit from receiver)
      TransactionType.INTERNAL_TRANSFER,
      correlationId,
      updatedReceiverWallet.balance, // Balance after for receiver
    );

    // Transaction for original payer (getting money back)
    await this.transactionService.createTransaction(
      payment.receiverId, // fromWalletId (receiver giving back)
      payment.senderId, // toWalletId (payer getting back)
      payment.amount, // Positive amount (credit to payer)
      TransactionType.INTERNAL_TRANSFER,
      correlationId,
      updatedSenderWallet.balance, // Balance after for sender
    );
  }
}
