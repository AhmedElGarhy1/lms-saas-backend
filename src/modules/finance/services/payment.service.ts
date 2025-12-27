import { Injectable, Logger } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentSource } from '../enums/payment-source.enum';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import {
  BusinessLogicException,
  InsufficientFundsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { RequestContext } from '@/shared/common/context/request.context';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { WalletService } from './wallet.service';
import { CashboxService } from './cashbox.service';
import { TransactionService } from './transaction.service';
import { CashTransactionService } from './cash-transaction.service';
import { CashTransactionDirection } from '../enums/cash-transaction-direction.enum';
import { CashTransactionType } from '../enums/cash-transaction-type.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { randomUUID } from 'crypto';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { SelectQueryBuilder } from 'typeorm';
import { Pagination } from '@/shared/common/types/pagination.types';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';
import {
  PaymentGatewayType,
  PaymentGatewayMethod,
} from '../adapters/interfaces/payment-gateway.interface';
import {
  CreatePaymentRequest,
  RefundPaymentRequest,
  RefundPaymentResponse,
} from '../adapters/interfaces/payment-gateway.interface';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { FinanceMonitorService } from '../monitoring/finance-monitor.service';

@Injectable()
export class PaymentService extends BaseService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly walletService: WalletService,
    private readonly cashboxService: CashboxService,
    private readonly transactionService: TransactionService,
    private readonly cashTransactionService: CashTransactionService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly financeMonitor: FinanceMonitorService,
  ) {
    super();
  }

  /**
   * Get createdByProfileId from RequestContext or use SYSTEM_USER_ID
   *
   * @returns The profile ID of the payment creator
   *
   * @example
   * const creatorId = this.getCreatedByProfileId();
   * // Returns user profile ID if authenticated, otherwise SYSTEM_USER_ID
   */
  private getCreatedByProfileId(): string {
    const ctx = RequestContext.get();
    return ctx.userProfileId || SYSTEM_USER_ID;
  }

  /**
   * Create payment record with PENDING status
   * Moves amount from balance to lockedBalance (escrow logic)
   * Implements idempotency check to prevent duplicate payments
   *
   * @param amount - Payment amount (must be positive)
   * @param payerProfileId - Profile ID of the person making payment
   * @param receiverId - ID of payment recipient (wallet owner)
   * @param receiverType - Type of recipient (USER_PROFILE, CENTER, etc.)
   * @param reason - Business reason for payment (SESSION, TOPUP, etc.)
   * @param source - Payment source (WALLET or CASH)
   * @param referenceType - Optional reference to transaction/cash-transaction
   * @param referenceId - Optional reference ID
   * @param correlationId - Optional correlation ID for split payments
   * @param idempotencyKey - Optional key to prevent duplicate payments
   *
   * @returns Promise<Payment> - Created payment record
   *
   * @throws InsufficientFundsException - If wallet has insufficient balance
   *
   * @example
   * // Create wallet payment with escrow
   * const payment = await paymentService.createPayment(
   *   Money.from(50.00),
   *   userProfileId,
   *   teacherProfileId,
   *   WalletOwnerType.USER_PROFILE,
   *   PaymentReason.SESSION,
   *   PaymentSource.WALLET,
   *   undefined, // no reference
   *   undefined, // no referenceId
   *   undefined, // auto-generate correlationId
   *   'unique-payment-key-123' // idempotency key
   * );
   */
  @Transactional()
  async createPayment(
    amount: Money,
    payerProfileId: string,
    receiverId: string,
    receiverType: WalletOwnerType,
    reason: PaymentReason,
    source: PaymentSource,
    referenceType?: PaymentReferenceType,
    referenceId?: string,
    correlationId?: string,
    idempotencyKey?: string,
  ): Promise<Payment> {
    // Idempotency check: If idempotencyKey provided, check for existing payment
    if (idempotencyKey) {
      const existingPayments =
        await this.paymentRepository.findByIdempotencyKey(
          idempotencyKey,
          payerProfileId,
        );

      if (existingPayments.length > 0) {
        // Return existing payment instead of creating duplicate
        return existingPayments[0];
      }
    }

    // If source is WALLET, lock the amount in payer's wallet
    if (source === PaymentSource.WALLET) {
      // Get payer's wallet (assuming payer is a UserProfile)
      const payerWallet = await this.walletService.getWallet(
        payerProfileId,
        WalletOwnerType.USER_PROFILE,
      );

      // Pre-check: Check if balance is sufficient (before acquiring lock)
      // This prevents database constraint violation errors
      const availableBalance = payerWallet.balance.subtract(
        payerWallet.lockedBalance,
      );
      if (availableBalance.lessThan(amount)) {
        throw new InsufficientFundsException('t.messages.businessLogicError', {
          message: 'Insufficient balance',
        } as never);
      }

      // Move amount from balance to lockedBalance
      // Use wallet service methods to ensure pessimistic locking
      await this.walletService.updateBalance(
        payerWallet.id,
        amount.multiply(-1),
      );
      await this.walletService.updateLockedBalance(payerWallet.id, amount);
    }

    const payment = await this.paymentRepository.create({
      amount,
      payerProfileId,
      receiverId,
      receiverType,
      status: PaymentStatus.PENDING,
      reason,
      source,
      referenceType,
      referenceId,
      correlationId: correlationId || randomUUID(),
      idempotencyKey,
      createdByProfileId: this.getCreatedByProfileId(),
    });

    return payment;
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);
    return payment;
  }

  /**
   * Validate polymorphic reference (service-level foreign key)
   */
  @Transactional()
  async validateReference(
    referenceType: PaymentReferenceType,
    referenceId: string,
  ): Promise<boolean> {
    if (referenceType === PaymentReferenceType.TRANSACTION) {
      const exists =
        await this.transactionService.transactionExists(referenceId);
      if (!exists) {
        throw new BusinessLogicException('t.messages.businessLogicError');
      }
    } else if (referenceType === PaymentReferenceType.CASH_TRANSACTION) {
      const exists =
        await this.cashTransactionService.cashTransactionExists(referenceId);
      if (!exists) {
        throw new BusinessLogicException('t.messages.businessLogicError');
      }
    }
    return true;
  }

  /**
   * Complete payment - mark as completed, trigger balance updates, set paidAt
   */
  @Transactional()
  async completePayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    // Validate reference if exists
    if (payment.referenceType && payment.referenceId) {
      await this.validateReference(payment.referenceType, payment.referenceId);
    }

    // If source is WALLET, deduct from lockedBalance (already locked)
    if (payment.source === PaymentSource.WALLET) {
      const payerWallet = await this.walletService.getWallet(
        payment.payerProfileId,
        WalletOwnerType.USER_PROFILE,
      );

      // Deduct from lockedBalance
      await this.walletService.updateLockedBalance(
        payerWallet.id,
        payment.amount.multiply(-1),
      );

      // Add to receiver wallet
      await this.walletService.updateBalance(
        payment.receiverId,
        payment.amount,
      );
    }

    // Update payment status
    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Refund internal payment - reverse wallet balances (for state machine)
   */
  @Transactional()
  async refundInternalPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    // Reverse balances for internal payments
    if (payment.source === PaymentSource.WALLET) {
      const payerWallet = await this.walletService.getWallet(
        payment.payerProfileId,
        WalletOwnerType.USER_PROFILE,
      );
      const updatedPayerWallet = await this.walletService.updateBalance(
        payerWallet.id,
        payment.amount,
      );

      const updatedReceiverWallet = await this.walletService.updateBalance(
        payment.receiverId,
        payment.amount.multiply(-1),
      );

      // Create reversal transactions for audit trail
      const correlationId = payment.correlationId || randomUUID();

      // Transaction for original receiver (now giving back money)
      await this.transactionService.createTransaction(
        payment.receiverId, // fromWalletId (receiver giving back)
        payment.payerProfileId, // toWalletId (payer getting back)
        payment.amount.multiply(-1), // Negative amount (debit from receiver)
        TransactionType.INTERNAL_TRANSFER,
        correlationId,
        updatedReceiverWallet.balance, // Balance after for receiver
      );

      // Transaction for original payer (getting money back)
      await this.transactionService.createTransaction(
        payment.receiverId, // fromWalletId (receiver giving back)
        payment.payerProfileId, // toWalletId (payer getting back)
        payment.amount, // Positive amount (credit to payer)
        TransactionType.INTERNAL_TRANSFER,
        correlationId,
        updatedPayerWallet.balance, // Balance after for payer
      );
    } else if (payment.source === PaymentSource.CASH) {
      if (
        payment.referenceType === PaymentReferenceType.CASH_TRANSACTION &&
        payment.referenceId
      ) {
        await this.cashTransactionService.reverseCashTransaction(
          payment.referenceId,
        );
      }
    }

    payment.status = PaymentStatus.REFUNDED;
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Cancel payment - auto-rollback balances from lockedBalance
   */
  @Transactional()
  async cancelPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status === PaymentStatus.CANCELLED) {
      return payment; // Already cancelled
    }

    // If payment was PENDING and source is WALLET, move amount back from lockedBalance to balance
    if (
      payment.status === PaymentStatus.PENDING &&
      payment.source === PaymentSource.WALLET
    ) {
      const payerWallet = await this.walletService.getWallet(
        payment.payerProfileId,
        WalletOwnerType.USER_PROFILE,
      );

      // Move amount from lockedBalance back to balance
      await this.walletService.moveFromLockedToBalance(
        payerWallet.id,
        payment.amount,
      );
    }

    // If payment was COMPLETED, reverse the balances
    if (payment.status === PaymentStatus.COMPLETED) {
      if (payment.source === PaymentSource.WALLET) {
        // Reverse wallet balances
        const payerWallet = await this.walletService.getWallet(
          payment.payerProfileId,
          WalletOwnerType.USER_PROFILE,
        );
        await this.walletService.updateBalance(payerWallet.id, payment.amount);

        const receiverWallet = await this.walletService.getWallet(
          payment.receiverId,
          payment.receiverType,
        );
        await this.walletService.updateBalance(
          receiverWallet.id,
          payment.amount.multiply(-1),
        );
      } else if (payment.source === PaymentSource.CASH) {
        // Reverse cash transaction if exists
        if (
          payment.referenceType === PaymentReferenceType.CASH_TRANSACTION &&
          payment.referenceId
        ) {
          await this.cashTransactionService.reverseCashTransaction(
            payment.referenceId,
          );
        }
      }
    }

    payment.status = PaymentStatus.CANCELLED;
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Process cash deposit - Student pays cash
   * @param reason - Payment reason (SESSION for cash deposit, TOPUP for wallet top-up)
   */
  @Transactional()
  async processCashDeposit(
    branchId: string,
    amount: Money,
    payerProfileId: string,
    receiverId: string,
    receiverType: WalletOwnerType,
    receivedByProfileId: string,
    reason: PaymentReason,
    idempotencyKey?: string,
  ): Promise<Payment> {
    // Idempotency check: If idempotencyKey provided, check for existing payment
    if (idempotencyKey) {
      const existingPayments =
        await this.paymentRepository.findByIdempotencyKey(
          idempotencyKey,
          payerProfileId,
        );

      if (existingPayments.length > 0) {
        // Return existing payment instead of creating duplicate
        return existingPayments[0];
      }
    }
    // Get or create cashbox
    const cashbox = await this.cashboxService.getCashbox(branchId);

    // Create cash transaction (Direction: IN)
    const cashTransaction =
      await this.cashTransactionService.createCashTransaction(
        branchId,
        cashbox.id,
        amount,
        CashTransactionDirection.IN,
        receivedByProfileId,
        CashTransactionType.DEPOSIT,
      );

    // Update cashbox balance
    await this.cashboxService.updateBalance(cashbox.id, amount);

    // Create payment (Status: COMPLETED, Source: CASH)
    const payment = await this.paymentRepository.create({
      amount,
      payerProfileId,
      receiverId,
      receiverType,
      status: PaymentStatus.COMPLETED,
      reason,
      source: PaymentSource.CASH,
      referenceType: PaymentReferenceType.CASH_TRANSACTION,
      referenceId: cashTransaction.id,
      ...(idempotencyKey && { idempotencyKey }),
      paidAt: new Date(),
      createdByProfileId: this.getCreatedByProfileId(),
    });

    return payment;
  }

  /**
   * Process wallet topup - User adds credit to their own wallet via external payment
   */
  @Transactional()
  async processWalletTopup(
    amount: Money,
    payerProfileId: string,
    idempotencyKey?: string,
  ): Promise<Payment> {
    // Idempotency check: If idempotencyKey provided, check for existing payment
    if (idempotencyKey) {
      const existingPayments =
        await this.paymentRepository.findByIdempotencyKey(
          idempotencyKey,
          payerProfileId,
        );

      if (existingPayments.length > 0) {
        // Return existing payment instead of creating duplicate
        return existingPayments[0];
      }
    }

    // Get or create user's wallet
    const userWallet = await this.walletService.getWallet(
      payerProfileId,
      WalletOwnerType.USER_PROFILE,
    );

    // Credit the user's wallet (external payment, so we add to balance directly)
    const updatedWallet = await this.walletService.updateBalance(
      userWallet.id,
      amount,
    );

    // Create payment (Status: COMPLETED, Source: EXTERNAL for external payment)
    const payment = await this.paymentRepository.create({
      amount,
      payerProfileId,
      receiverId: userWallet.id,
      receiverType: WalletOwnerType.USER_PROFILE,
      status: PaymentStatus.COMPLETED,
      reason: PaymentReason.TOPUP,
      source: PaymentSource.EXTERNAL, // External payment gateway
      ...(idempotencyKey && { idempotencyKey }),
      paidAt: new Date(),
      createdByProfileId: this.getCreatedByProfileId(),
    });

    // Create transaction record for wallet statement (external credit)
    await this.transactionService.createTransaction(
      null, // fromWalletId (null = external source like payment gateway)
      userWallet.id, // toWalletId (user's wallet)
      amount,
      TransactionType.TOPUP,
      payment.correlationId || payment.id, // correlationId links to payment
      updatedWallet.balance, // Balance after transaction
    );

    return payment;
  }

  /**
   * Initiate external payment through payment gateway (e.g., Paymob)
   * This creates a payment record and initiates the external payment process
   */
  @Transactional()
  async initiateExternalPayment(
    amount: Money,
    payerProfileId: string,
    currency: string = 'EGP',
    description?: string,
    gatewayType: PaymentGatewayType = PaymentGatewayType.PAYMOB,
    idempotencyKey?: string,
    methodType?: PaymentGatewayMethod,
  ): Promise<{
    payment: Payment;
    checkoutUrl: string;
    gatewayPaymentId: string;
  }> {
    // Idempotency check
    if (idempotencyKey) {
      const existingPayments =
        await this.paymentRepository.findByIdempotencyKey(
          idempotencyKey,
          payerProfileId,
        );

      if (existingPayments.length > 0) {
        const existingPayment = existingPayments[0];
        // Return existing payment details if found
        return {
          payment: existingPayment,
          checkoutUrl: '', // Would need to be stored or retrieved
          gatewayPaymentId: '', // Would need to be stored
        };
      }
    }

    // Validate currency support
    if (!this.paymentGatewayService.supportsCurrency(currency, gatewayType)) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: `Currency ${currency} not supported by ${gatewayType}`,
      } as never);
    }

    // Create payment record with PENDING status
    const payment = await this.paymentRepository.create({
      amount,
      payerProfileId,
      receiverId: payerProfileId, // For topups, receiver is same as payer
      receiverType: WalletOwnerType.USER_PROFILE,
      status: PaymentStatus.PENDING,
      reason: PaymentReason.TOPUP,
      source: PaymentSource.EXTERNAL,
      referenceType: PaymentReferenceType.CASH_TRANSACTION, // Will be updated when completed
      correlationId: randomUUID(),
      idempotencyKey,
      createdByProfileId: this.getCreatedByProfileId(),
      metadata: {
        gateway: gatewayType,
        currency,
        description,
      },
    });

    try {
      // Fetch user profile data for customer details (with user relation)
      const userProfile = await this.userProfileService.findOne(payerProfileId);
      // Load user relation if not already loaded
      const user =
        userProfile?.user ||
        (await this.userService.findOne(userProfile?.userId));

      // Use real phone number
      const customerPhone = user?.phone || '';

      // Use real name
      const customerName = user?.name || '';

      // Use placeholder email since User entity doesn't have email field
      // TODO: Add email field to User entity for better UX
      // const customerEmail = user?.phone
      //   ? `user-${user.phone}@placeholder.local`
      //   : 'customer@placeholder.local';
      const customerEmail = 'gemater.g@gmail.com';

      // Create payment gateway request
      const gatewayRequest: CreatePaymentRequest = {
        amount,
        currency,
        orderId: payment.id,
        customerEmail,
        customerPhone,
        customerName,
        description: description || `Payment ${payment.id}`,
        methodType,
        metadata: {
          paymentId: payment.id,
          payerProfileId,
          correlationId: payment.correlationId,
        },
      };

      // Initiate payment through gateway
      const gatewayResponse = await this.paymentGatewayService.createPayment(
        gatewayRequest,
        gatewayType,
      );

      // Update payment with gateway details
      await this.paymentRepository.update(payment.id, {
        metadata: {
          ...payment.metadata,
          gatewayPaymentId: gatewayResponse.gatewayPaymentId,
          checkoutUrl: gatewayResponse.checkoutUrl,
          clientSecret: gatewayResponse.clientSecret,
        },
      });

      this.logger.log(
        `External payment initiated: ${payment.id} via ${gatewayType}`,
      );

      return {
        payment,
        checkoutUrl: gatewayResponse.checkoutUrl,
        gatewayPaymentId: gatewayResponse.gatewayPaymentId,
      };
    } catch (error) {
      // Update payment status to FAILED if gateway call fails
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.FAILED,
        metadata: {
          ...payment.metadata,
          failureReason: error.message,
          failedAt: new Date(),
        },
      });

      this.financeMonitor.recordPaymentFailed(
        'Paymob validation error',
        'paymob_validation_error',
      );

      this.logger.error(
        `Failed to initiate external payment: ${payment.id}`,
        error,
      );

      // Re-throw with user-friendly messages for specific Paymob errors
      if (
        error.message.includes('Integration ID') ||
        error.message.includes('configuration error')
      ) {
        throw new BusinessLogicException('t.messages.businessLogicError', {
          message:
            'Payment service is currently unavailable. Please contact support.',
        } as never);
      }

      if (
        error.message.includes('authentication failed') ||
        error.message.includes('Invalid API key')
      ) {
        throw new BusinessLogicException('t.messages.businessLogicError', {
          message:
            'Payment service is temporarily unavailable. Please try again later.',
        } as never);
      }

      if (
        error.message.includes('billing_data') ||
        error.message.includes('email')
      ) {
        throw new BusinessLogicException('t.messages.businessLogicError', {
          message:
            'Payment setup failed. Please ensure your profile information is complete.',
        } as never);
      }

      // For other errors, provide a generic message
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message:
          'Payment could not be processed. Please try again or contact support.',
      } as never);
    }
  }

  /**
   * Process completed external payment (called from webhook or gateway callback)
   * This completes the payment and credits the user's wallet
   */
  @Transactional()
  async processExternalPaymentCompletion(
    gatewayPaymentId: string,
    gatewayType: PaymentGatewayType,
    status: 'completed' | 'failed' | 'cancelled',
    paidAmount?: Money,
    failureReason?: string,
  ): Promise<Payment> {
    // Find payment by gateway payment ID
    const payment =
      await this.paymentRepository.findByGatewayPaymentId(gatewayPaymentId);
    if (!payment) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: `Payment not found for gateway payment ID: ${gatewayPaymentId}`,
      } as never);
    }

    // Check if payment is already processed
    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.log(`Payment already completed: ${payment.id}`);
      return payment;
    }

    if (payment.status === PaymentStatus.FAILED) {
      this.logger.log(`Payment already failed: ${payment.id}`);
      return payment;
    }

    // Update payment status
    const updateData: any = {
      status:
        status === 'completed'
          ? PaymentStatus.COMPLETED
          : status === 'failed'
            ? PaymentStatus.FAILED
            : status === 'cancelled'
              ? PaymentStatus.CANCELLED
              : PaymentStatus.PENDING,
      metadata: {
        ...payment.metadata,
        processedAt: new Date(),
        failureReason,
      },
    };

    if (status === 'completed') {
      updateData.paidAt = new Date();

      // For completed payments, credit the user's wallet
      const userWallet = await this.walletService.getWallet(
        payment.payerProfileId,
        WalletOwnerType.USER_PROFILE,
      );

      const amountToCredit = paidAmount || payment.amount;

      // Credit the wallet
      const updatedWallet = await this.walletService.updateBalance(
        userWallet.id,
        amountToCredit,
      );

      // Create transaction record
      await this.transactionService.createTransaction(
        null, // fromWalletId (external)
        userWallet.id, // toWalletId
        amountToCredit,
        TransactionType.TOPUP,
        payment.correlationId || payment.id,
        updatedWallet.balance,
      );

      updateData.metadata.creditedAmount = amountToCredit.toString();
      updateData.metadata.walletId = userWallet.id;
    }

    const updatedPayment = await this.paymentRepository.updateThrow(
      payment.id,
      updateData,
    );

    this.logger.log(
      `External payment ${status}: ${payment.id} via ${gatewayType}`,
    );

    return updatedPayment;
  }

  /**
   * Process refund through payment gateway
   * This refunds money back to the customer's original payment method
   */
  @Transactional()
  async refundPayment(
    paymentId: string,
    refundAmount: Money,
    reason?: string,
  ): Promise<{ payment: Payment; refund: RefundPaymentResponse }> {
    // Find the original payment
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    // Validate payment can be refunded
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: `Payment ${paymentId} is not in a refundable state. Current status: ${payment.status}`,
      } as never);
    }

    if (payment.source !== PaymentSource.EXTERNAL) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: `Payment ${paymentId} is not an external payment and cannot be refunded through payment gateway`,
      } as never);
    }

    // Validate refund amount
    if (refundAmount.greaterThan(payment.amount)) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: `Refund amount ${refundAmount.toString()} exceeds payment amount ${payment.amount.toString()}`,
      } as never);
    }

    // Get gateway payment ID from metadata
    const gatewayPaymentId = payment.metadata?.gatewayPaymentId;
    if (!gatewayPaymentId) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: `Payment ${paymentId} does not have gateway payment ID for refund`,
      } as never);
    }

    // Record refund request for monitoring
    this.financeMonitor.recordRefundRequested(refundAmount, 'paymob');

    // CRITICAL SAFETY CHECK: Ensure student still has these funds in their wallet
    // If they've spent the money on sessions, we cannot refund it
    const userWallet = await this.walletService.getWallet(
      payment.payerProfileId,
      WalletOwnerType.USER_PROFILE,
    );

    const availableBalance = userWallet.balance.subtract(
      userWallet.lockedBalance,
    );
    if (availableBalance.lessThan(refundAmount)) {
      this.financeMonitor.recordRefundProcessed(
        refundAmount,
        'paymob',
        'failed',
      );
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: `Cannot refund ${refundAmount.toString()}: Student has insufficient available balance (${availableBalance.toString()}). Funds may have been spent on sessions.`,
      } as never);
    }

    try {
      // Process refund through payment gateway
      const refundRequest: RefundPaymentRequest = {
        gatewayPaymentId,
        amount: refundAmount,
        reason,
      };

      const refundResponse =
        await this.paymentGatewayService.refundPayment(refundRequest);

      // Record successful refund
      this.financeMonitor.recordRefundProcessed(
        refundAmount,
        'paymob',
        'success',
      );

      // Update payment status to REFUNDED if full refund
      const isFullRefund = refundAmount.equals(payment.amount);
      if (isFullRefund) {
        await this.paymentRepository.update(payment.id, {
          status: PaymentStatus.REFUNDED,
          metadata: {
            ...payment.metadata,
            refundId: refundResponse.gatewayRefundId,
            refundAmount: refundAmount.toString(),
            refundReason: reason,
            refundedAt: new Date(),
          },
        });
      }

      // Debit the wallet (remove the refunded amount)
      const userWallet = await this.walletService.getWallet(
        payment.payerProfileId,
        WalletOwnerType.USER_PROFILE,
      );

      const updatedWallet = await this.walletService.updateBalance(
        userWallet.id,
        refundAmount.multiply(-1), // Debit the refunded amount
      );

      // Create transaction record for refund
      await this.transactionService.createTransaction(
        userWallet.id, // fromWalletId (user's wallet)
        null, // toWalletId (external)
        refundAmount.multiply(-1), // Negative amount (debit)
        TransactionType.REFUND,
        payment.correlationId || payment.id,
        updatedWallet.balance,
      );

      this.logger.log(
        `Payment refund processed: ${paymentId}, amount: ${refundAmount.toString()}`,
      );

      return {
        payment: await this.paymentRepository.findOneOrThrow(paymentId),
        refund: refundResponse,
      };
    } catch (error) {
      // Record failed refund
      this.financeMonitor.recordRefundProcessed(
        refundAmount,
        'paymob',
        'failed',
      );

      this.logger.error(`Payment refund failed: ${paymentId}`, {
        refundAmount: refundAmount.toString(),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @internal
   * Process wallet transfer - Internal transfer
   * This method is for service-to-service calls only.
   * Frontend should never call this directly.
   * Wallet transfers should be triggered internally by business modules (e.g., SessionsModule).
   */
  @Transactional()
  async processWalletTransfer(
    fromWalletId: string,
    toWalletId: string,
    amount: Money,
    payerProfileId: string,
    receiverId: string,
    receiverType: WalletOwnerType,
  ): Promise<Payment> {
    // Update both wallets atomically
    const fromWallet = await this.walletService.updateBalance(
      fromWalletId,
      amount.multiply(-1),
    );
    const toWallet = await this.walletService.updateBalance(toWalletId, amount);

    // Create transaction records for both wallets with balance snapshots
    const correlationId = randomUUID();

    // Transaction for sender (debit)
    const debitTransaction = await this.transactionService.createTransaction(
      fromWalletId,
      toWalletId,
      amount.multiply(-1), // Negative amount for debit
      TransactionType.INTERNAL_TRANSFER,
      correlationId,
      fromWallet.balance, // Balance after debit
    );

    // Transaction for receiver (credit)
    await this.transactionService.createTransaction(
      fromWalletId,
      toWalletId,
      amount, // Positive amount for credit
      TransactionType.INTERNAL_TRANSFER,
      correlationId,
      toWallet.balance, // Balance after credit
    );

    // Create payment (Status: COMPLETED, Source: WALLET)
    const payment = await this.paymentRepository.create({
      amount,
      payerProfileId,
      receiverId,
      receiverType,
      status: PaymentStatus.COMPLETED,
      reason: PaymentReason.INTERNAL_TRANSFER,
      source: PaymentSource.WALLET,
      referenceType: PaymentReferenceType.TRANSACTION,
      referenceId: debitTransaction.id, // Reference the debit transaction
      correlationId,
      paidAt: new Date(),
      createdByProfileId: this.getCreatedByProfileId(),
    });

    return payment;
  }

  /**
   * Process split payment - Handle split payments with correlationId validation
   */
  @Transactional()
  async processSplitPayment(
    transactions: Array<{
      fromWalletId?: string;
      toWalletId?: string;
      amount: Money;
      type: TransactionType;
    }>,
    payerProfileId: string,
    receiverId: string,
    receiverType: WalletOwnerType,
    reason: PaymentReason,
    correlationId?: string,
  ): Promise<Payment> {
    const sharedCorrelationId = correlationId || randomUUID();

    // Calculate total amount
    const totalAmount = transactions.reduce(
      (sum, tx) => sum.add(tx.amount),
      Money.zero(),
    );

    // Update wallets and collect balance snapshots
    const transactionsWithBalances = [];
    for (const tx of transactions) {
      let balanceAfter: Money | undefined;

      if (tx.fromWalletId) {
        const updatedWallet = await this.walletService.updateBalance(
          tx.fromWalletId,
          tx.amount.multiply(-1),
        );
        balanceAfter = updatedWallet.balance;
      } else if (tx.toWalletId) {
        const updatedWallet = await this.walletService.updateBalance(
          tx.toWalletId,
          tx.amount,
        );
        balanceAfter = updatedWallet.balance;
      }

      transactionsWithBalances.push({
        ...tx,
        balanceAfter: balanceAfter!,
      });
    }

    // Create split transactions with balance snapshots
    const createdTransactions =
      await this.transactionService.createSplitTransactions(
        transactionsWithBalances,
        sharedCorrelationId,
      );

    // Create payment with correlationId
    const payment = await this.paymentRepository.create({
      amount: totalAmount,
      payerProfileId,
      receiverId,
      receiverType,
      status: PaymentStatus.COMPLETED,
      reason,
      source: PaymentSource.WALLET,
      referenceType: PaymentReferenceType.TRANSACTION,
      referenceId: createdTransactions[0]?.id,
      correlationId: sharedCorrelationId,
      paidAt: new Date(),
      createdByProfileId: this.getCreatedByProfileId(),
    });

    // Validate correlation sum
    await this.transactionService.validateCorrelationSum(
      sharedCorrelationId,
      totalAmount,
    );

    return payment;
  }

  /**
   * Paginate payments
   */
  async paginatePayments(
    dto: PaginatePaymentDto,
  ): Promise<Pagination<Payment>> {
    const queryBuilder: SelectQueryBuilder<Payment> =
      this.paymentRepository.createQueryBuilder('payment');

    // Apply filters
    if (dto.status) {
      queryBuilder.andWhere('payment.status = :status', { status: dto.status });
    }
    if (dto.reason) {
      queryBuilder.andWhere('payment.reason = :reason', { reason: dto.reason });
    }
    if (dto.source) {
      queryBuilder.andWhere('payment.source = :source', { source: dto.source });
    }
    if (dto.payerProfileId) {
      queryBuilder.andWhere('payment.payerProfileId = :payerProfileId', {
        payerProfileId: dto.payerProfileId,
      });
    }

    return this.paymentRepository.paginate(
      dto,
      {
        searchableColumns: ['reason', 'status'],
        sortableColumns: ['createdAt', 'amount', 'status'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '/finance/payments',
      queryBuilder,
    );
  }

  /**
   * Find payment by correlation ID (used for webhook processing)
   */
  async findByCorrelationId(correlationId: string): Promise<Payment | null> {
    return this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.correlationId = :correlationId', { correlationId })
      .getOne();
  }
}
