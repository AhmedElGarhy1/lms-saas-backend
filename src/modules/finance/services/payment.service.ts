import { Injectable, Logger } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { Payment } from '../entities/payment.entity';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentType } from '../enums/payment-type.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import { Transactional } from '@nestjs-cls/transactional';
import { RequestContext } from '@/shared/common/context/request.context';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { WalletService } from './wallet.service';
import { CashboxService } from './cashbox.service';
import { TransactionService } from './transaction.service';
import { CashTransactionService } from './cash-transaction.service';
import {
  CashTransactionDirection,
  CashTransactionType,
} from '../enums/cash-transaction-direction.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { randomUUID } from 'crypto';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { SelectQueryBuilder } from 'typeorm';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
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
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Branch } from '@/modules/centers/entities/branch.entity';

// Import the new specialized services
import { PaymentCreatorService } from './payment-creator.service';
import { PaymentExecutorService } from './payment-executor.service';
import { PaymentRefundService } from './payment-refund.service';
import { ExternalPaymentService } from './external-payment.service';
import { PaymentQueryService } from './payment-query.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

// DTOs for the unified payment execution API
export interface ExecutePaymentRequest {
  amount: Money;
  senderId: string;
  senderType: WalletOwnerType;
  receiverId: string;
  receiverType: WalletOwnerType;
  reason: PaymentReason;
  source: PaymentMethod;
  type?: PaymentType; // Defaults to INTERNAL
  correlationId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  referenceType?: PaymentReferenceType;
  referenceId?: string;
}

export interface ExecutePaymentResponse {
  payment: Payment;
  transactions: Transaction[];
  cashTransactions?: CashTransaction[];
  executionDetails: {
    walletOperations?: {
      senderWalletUpdated: boolean;
      receiverWalletUpdated: boolean;
    };
    cashOperations?: {
      cashboxUpdated: boolean;
    };
  };
}

@Injectable()
export class PaymentService extends BaseService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly walletService: WalletService,
    private readonly cashboxService: CashboxService,
    private readonly transactionService: TransactionService,
    private readonly cashTransactionService: CashTransactionService,
    // New specialized services
    private readonly paymentCreator: PaymentCreatorService,
    private readonly paymentExecutor: PaymentExecutorService,
    private readonly paymentRefunder: PaymentRefundService,
    private readonly externalPaymentService: ExternalPaymentService,
    private readonly paymentQuery: PaymentQueryService,
    private readonly paymentOrchestrator: PaymentOrchestratorService,
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
   * @param senderId - Profile ID of the person making payment
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
   *   PaymentReason.SESSION_FEE,
   *   PaymentMethod.WALLET,
   *   undefined, // no reference
   *   undefined, // no referenceId
   *   undefined, // auto-generate correlationId
   *   'unique-payment-key-123' // idempotency key
   * );
   */
  @Transactional()
  async createPayment(
    amount: Money,
    senderId: string,
    senderType: WalletOwnerType,
    receiverId: string,
    receiverType: WalletOwnerType,
    reason: PaymentReason,
    source: PaymentMethod,
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
          senderId,
        );

      if (existingPayments.length > 0) {
        // Return existing payment instead of creating duplicate
        return existingPayments[0];
      }
    }

    // If source is WALLET, lock the amount in sender's wallet
    if (source === PaymentMethod.WALLET) {
      // Get sender's wallet
      const senderWallet = await this.walletService.getWallet(
        senderId,
        senderType,
      );

      // Pre-check: Check if balance is sufficient
      if (senderWallet.balance.lessThan(amount)) {
        throw FinanceErrors.insufficientWalletBalance();
      }

      // Debit the sender's balance
      await this.walletService.updateBalance(
        senderWallet.id,
        amount.multiply(-1),
      );
    }

    const payment = await this.paymentRepository.create({
      amount,
      senderId,
      senderType,
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
    return await this.paymentRepository.findOneOrThrow(paymentId);
  }

  async getPaymentById(paymentId: string): Promise<Payment> {
    return this.getPayment(paymentId);
  }

  async createAndExecutePayment(
    request: ExecutePaymentRequest,
    actor: ActorUser,
  ): Promise<ExecutePaymentResponse> {
    // Delegate to the orchestrator service
    return await this.paymentOrchestrator.createAndExecutePayment(
      request,
      actor,
    );
  }

  async refundPayment(
    paymentId: string,
    refundAmount: Money,
    reason?: string,
  ): Promise<{ payment: Payment; refund: any }> {
    // Delegate to the orchestrator service
    return await this.paymentOrchestrator.refundPayment(
      paymentId,
      refundAmount,
      reason,
    );
  }

  async getUserPaymentsPaginated(
    userId: string,
    dto: PaginatePaymentDto,
    centerId?: string,
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    return await this.paymentRepository.getPaymentsPaginated(dto, undefined, {
      userId,
      centerId,
      includeAll: false,
    });
  }

  async getCenterPaymentsPaginated(
    centerId: string | undefined,
    dto: PaginatePaymentDto,
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    return await this.paymentRepository.getPaymentsPaginated(dto, undefined, {
      centerId,
      includeAll: true, // Show all payments for the center
    });
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
        throw FinanceErrors.paymentReferenceInvalid();
      }
    } else if (referenceType === PaymentReferenceType.CASH_TRANSACTION) {
      const exists =
        await this.cashTransactionService.cashTransactionExists(referenceId);
      if (!exists) {
        throw FinanceErrors.paymentReferenceInvalid();
      }
    }
    return true;
  }

  /**
   * Complete payment - mark as completed, trigger balance updates, set paidAt
   */
  @Transactional()
  async completePayment(
    paymentId: string,
    paidByProfileId: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw FinanceErrors.paymentNotPending();
    }

    // Validate reference if exists
    if (payment.referenceType && payment.referenceId) {
      await this.validateReference(payment.referenceType, payment.referenceId);
    }

    // If source is WALLET, deduct from lockedBalance (already locked)
    if (payment.source === PaymentMethod.WALLET) {
      const senderWallet = await this.walletService.getWallet(
        payment.senderId,
        payment.senderType,
      );

      // Debit from sender wallet and get updated sender wallet
      const updatedSenderWallet = await this.walletService.updateBalance(
        senderWallet.id,
        payment.amount.multiply(-1),
      );

      // Get or create receiver wallet (handles USER_PROFILE, BRANCH, etc.)
      const receiverWallet = await this.walletService.getWallet(
        payment.receiverId,
        payment.receiverType as WalletOwnerType,
      );

      // Add to receiver wallet and get updated receiver wallet
      const updatedReceiverWallet = await this.walletService.updateBalance(
        receiverWallet.id,
        payment.amount,
      );

      // Create transaction records for audit trail with correct balances
      await this.createWalletTransactionRecords(
        payment,
        updatedSenderWallet,
        updatedReceiverWallet,
        payment.amount,
        payment.id, // paymentId
      );
    }

    // Handle cash payments - create cash transaction records
    if (payment.source === PaymentMethod.CASH) {
      await this.createCashTransactionRecords(
        payment,
        paidByProfileId,
        payment.id,
      );
    }

    // Update payment status
    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Create transaction records for wallet payment completion
   */
  private async createWalletTransactionRecords(
    payment: Payment,
    senderWallet: Wallet,
    receiverWallet: Wallet,
    amount: Money,
    paymentId?: string,
  ): Promise<void> {
    const correlationId = payment.correlationId || randomUUID();

    // Determine transaction type based on payment reason
    const transactionType = this.mapPaymentReasonToTransactionType(
      payment.reason,
    );

    // Create debit transaction (sender)
    await this.transactionService.createTransaction(
      senderWallet.id,
      receiverWallet.id,
      amount.multiply(-1), // Negative for debit
      transactionType,
      correlationId,
      senderWallet.balance, // Balance after debit
      paymentId,
    );

    // Create credit transaction (receiver)
    await this.transactionService.createTransaction(
      senderWallet.id,
      receiverWallet.id,
      amount, // Positive for credit
      transactionType,
      correlationId,
      receiverWallet.balance, // Balance after credit
      paymentId,
    );
  }

  /**
   * Create cash transaction records for cash payment completion
   */
  private async createCashTransactionRecords(
    payment: Payment,
    paidByProfileId: string,
    paymentId?: string,
  ): Promise<void> {
    // For cash payments, we need to determine which branch and cashbox to use
    // Since cash payments in billing go to branches, we'll use the receiverId as branchId
    const branchId = payment.receiverId; // Branch that receives the payment

    // Get or create cashbox for the branch
    const cashbox = await this.cashboxService.getCashbox(branchId);

    // Determine transaction type for cash transaction
    const cashTransactionType = CashTransactionType.BRANCH_DEPOSIT;

    // Create cash transaction (money coming into cashbox)
    const cashTransaction =
      await this.cashTransactionService.createCashTransaction(
        branchId,
        cashbox.id,
        payment.amount,
        CashTransactionDirection.IN,
        payment.createdByProfileId, // Who processed the payment (receivedBy)
        cashTransactionType,
        paidByProfileId, // Who paid the cash (payer)
        paymentId, // paymentId
      );

    // Update cashbox balance
    await this.cashboxService.updateBalance(cashbox.id, payment.amount);

    // Update payment with cash transaction reference
    payment.referenceType = PaymentReferenceType.CASH_TRANSACTION;
    payment.referenceId = cashTransaction.id;
  }

  /**
   * Refund internal payment - reverse wallet balances (for state machine)
   */
  @Transactional()
  async refundInternalPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw FinanceErrors.paymentNotCompleted();
    }

    // Reverse balances for internal payments
    if (payment.source === PaymentMethod.WALLET) {
      const senderWallet = await this.walletService.getWallet(
        payment.senderId,
        payment.senderType,
      );
      const updatedSenderWallet = await this.walletService.updateBalance(
        senderWallet.id,
        payment.amount,
      );

      // Get receiver wallet and reverse the amount
      const receiverWallet = await this.walletService.getWallet(
        payment.receiverId,
        payment.receiverType as WalletOwnerType,
      );
      const updatedReceiverWallet = await this.walletService.updateBalance(
        receiverWallet.id,
        payment.amount.multiply(-1),
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
    } else if (payment.source === PaymentMethod.CASH) {
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

    // For PENDING payments, no balance changes were made yet, so nothing to reverse

    // If payment was COMPLETED, reverse the balances
    if (payment.status === PaymentStatus.COMPLETED) {
      if (payment.source === PaymentMethod.WALLET) {
        // Reverse wallet balances
        const payerWallet = await this.walletService.getWallet(
          payment.senderId,
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
      } else if (payment.source === PaymentMethod.CASH) {
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
   * Process wallet topup - User adds credit to their own wallet via external payment
   */
  @Transactional()
  async processWalletTopup(
    amount: Money,
    senderId: string,
    idempotencyKey?: string,
  ): Promise<Payment> {
    // Idempotency check: If idempotencyKey provided, check for existing payment
    if (idempotencyKey) {
      const existingPayments =
        await this.paymentRepository.findByIdempotencyKey(
          idempotencyKey,
          senderId,
        );

      if (existingPayments.length > 0) {
        // Return existing payment instead of creating duplicate
        return existingPayments[0];
      }
    }

    // Get or create user's wallet
    const userWallet = await this.walletService.getWallet(
      senderId,
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
      senderId,
      receiverId: userWallet.id,
      receiverType: WalletOwnerType.USER_PROFILE,
      status: PaymentStatus.COMPLETED,
      reason: PaymentReason.TOPUP,
      source: PaymentMethod.EXTERNAL, // External payment gateway
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
    senderId: string,
    currency: string = 'EGP',
    actor: ActorUser,
    description?: string,
    gatewayType: PaymentGatewayType = PaymentGatewayType.PAYMOB,
    idempotencyKey?: string,
    methodType?: PaymentGatewayMethod,
  ): Promise<{
    payment: Payment;
    checkoutUrl: string;
    gatewayPaymentId: string;
  }> {
    // Delegate to the orchestrator service
    return await this.paymentOrchestrator.initiateExternalPayment(
      amount,
      senderId,
      actor,
      currency,
      description,
      gatewayType,
      idempotencyKey,
      methodType,
    );
  }

  async completeExternalPayment(
    paymentId: string,
    externalReference?: string,
  ): Promise<Payment> {
    return await this.externalPaymentService.completeExternalPayment(
      paymentId,
      externalReference,
    );
  }

  async failExternalPayment(
    paymentId: string,
    failureReason: string,
  ): Promise<Payment> {
    return await this.externalPaymentService.failExternalPayment(
      paymentId,
      failureReason,
    );
  }

  async processExternalPaymentCompletion(
    gatewayReference: string,
    gatewayType: any,
    status: 'completed' | 'failed' | 'cancelled',
    amount?: Money,
    failureReason?: string,
  ): Promise<Payment | null> {
    // Create gateway data object from parameters
    const gatewayData = {
      status,
      amount,
      failureReason,
      gatewayType,
    };

    return await this.externalPaymentService.processExternalPaymentCompletion(
      gatewayReference,
      gatewayData,
    );
  }

  /**
   * Complete an executed payment
   */
  private async completeExecutedPayment(
    payment: Payment,
    executionResult: any,
  ): Promise<Payment> {
    // Only complete INTERNAL payments immediately
    // EXTERNAL payments remain PENDING until confirmed by provider
    if (payment.type === PaymentType.INTERNAL) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
    }

    // Save updated payment
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Log payment execution for monitoring
   */
  private async logPaymentExecution(
    payment: Payment,
    result: any,
  ): Promise<void> {
    this.logger.log(`Payment executed successfully`, {
      paymentId: payment.id,
      amount: payment.amount.toNumber(),
      senderId: payment.senderId,
      receiverId: payment.receiverId,
    });
  }

  /**
   * Map payment reason to transaction type
   */
  private mapPaymentReasonToTransactionType(
    reason: PaymentReason,
  ): TransactionType {
    switch (reason) {
      case PaymentReason.TOPUP:
        return TransactionType.TOPUP;
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
      case PaymentReason.INTERNAL_TRANSFER:
      default:
        return TransactionType.INTERNAL_TRANSFER;
    }
  }
}
