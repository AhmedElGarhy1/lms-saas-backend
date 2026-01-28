import { Injectable, Logger } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { Payment } from '../entities/payment.entity';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
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
import { CashTransactionDirection } from '../enums/cash-transaction-direction.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { randomUUID } from 'crypto';
import { mapPaymentReasonToTransactionType } from '../utils/payment-reason-mapper.util';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
import { PaymentGatewayType } from '../adapters/interfaces/payment-gateway.interface';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ExternalPaymentService } from './external-payment.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

// DTOs for the unified payment execution API
export interface ExecutePaymentRequest {
  amount: Money;
  senderId: string;
  senderType: WalletOwnerType;
  receiverId: string;
  receiverType: WalletOwnerType;
  reason: PaymentReason;
  paymentMethod: PaymentMethod;
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
    private readonly externalPaymentService: ExternalPaymentService,
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
   * @param paymentMethod - Payment method (WALLET, CASH, or EXTERNAL)
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
    paymentMethod: PaymentMethod,
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

    // If paymentMethod is WALLET, lock the amount in sender's wallet
    if (paymentMethod === PaymentMethod.WALLET) {
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
      paymentMethod,
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

  async refundPayment(paymentId: string): Promise<{
    payment: Payment;
    refund: { success: boolean; transactionId: string };
  }> {
    // Delegate to the orchestrator service
    return await this.paymentOrchestrator.refundPayment(paymentId);
  }

  async getUserPaymentsPaginated(
    dto: PaginatePaymentDto,
    actor: ActorUser,
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    return await this.paymentRepository.getPaymentsPaginated(dto, actor, false);
  }

  async getCenterPaymentsPaginated(
    dto: PaginatePaymentDto,
    actor: ActorUser,
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    return await this.paymentRepository.getPaymentsPaginated(dto, actor, true);
  }

  async getCenterFinancialMetricsForMonth(
    centerId: string,
    year: number,
    month: number,
  ): Promise<{
    wallet: { revenue: Money; expenses: Money };
    cash: { revenue: Money; expenses: Money };
  }> {
    return this.paymentRepository.getCenterFinancialMetricsForMonth(
      centerId,
      year,
      month,
    );
  }

  /**
   * Get a payment with relations
   * Payment details are relatively public since they're already filtered at the list level
   */
  async getPaymentWithRelations(paymentId: string): Promise<Payment> {
    // Get the payment with relations - access control is handled at the list level
    return await this.paymentRepository.findPaymentForResponseOrThrow(
      paymentId,
    );
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

    // If source is WALLET, deduct from lockedBalance (already locked)
    if (payment.paymentMethod === PaymentMethod.WALLET) {
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
        payment.receiverType,
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
    if (payment.paymentMethod === PaymentMethod.CASH) {
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
    const transactionType = mapPaymentReasonToTransactionType(payment.reason);

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
    // Determine branch and direction based on whether branch is sender or receiver
    let branchId: string;
    let direction: CashTransactionDirection;
    let receivedByProfileId: string;
    let finalPaidByProfileId: string;

    if (payment.senderType === WalletOwnerType.BRANCH) {
      // Branch is sending money (withdrawal) - e.g., expenses, teacher payouts
      branchId = payment.senderId;
      direction = CashTransactionDirection.OUT;
      receivedByProfileId = payment.receiverId; // Teacher/user receiving the cash
      finalPaidByProfileId = payment.createdByProfileId; // Staff who processed/gave the cash
    } else if (payment.receiverType === WalletOwnerType.BRANCH) {
      // Branch is receiving money (deposit) - e.g., student fees
      branchId = payment.receiverId;
      direction = CashTransactionDirection.IN;
      receivedByProfileId = payment.createdByProfileId; // Staff who received/processed the cash
      finalPaidByProfileId = payment.senderId; // Student/user who paid the cash
    } else {
      // No branch involved in this cash payment - shouldn't happen for cash payments
      throw FinanceErrors.invalidCashPaymentConfiguration();
    }

    // Get or create cashbox for the branch
    const cashbox = await this.cashboxService.getCashbox(branchId);

    // Determine transaction type for cash transaction based on payment reason
    const cashTransactionType = mapPaymentReasonToTransactionType(
      payment.reason,
    );

    // Calculate balance after transaction
    const currentBalance = cashbox.balance;
    const balanceAfter =
      direction === CashTransactionDirection.IN
        ? currentBalance.add(payment.amount)
        : currentBalance.subtract(payment.amount);

    // Create cash transaction
    await this.cashTransactionService.createCashTransaction(
      branchId,
      cashbox.id,
      payment.amount,
      direction,
      receivedByProfileId,
      cashTransactionType,
      finalPaidByProfileId, // Who paid/provided the cash
      paymentId, // paymentId
      balanceAfter, // Pass calculated balance
    );

    // Update cashbox balance
    const balanceChange =
      direction === CashTransactionDirection.IN
        ? payment.amount
        : payment.amount.multiply(-1);
    await this.cashboxService.updateBalance(cashbox.id, balanceChange);

    // Note: Payment is already linked to CashTransaction via paymentId field
    // No need for redundant referenceType/referenceId
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
    if (payment.paymentMethod === PaymentMethod.WALLET) {
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
        payment.receiverType,
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
    } else if (payment.paymentMethod === PaymentMethod.CASH) {
      // For cash payments, find and reverse the associated cash transaction
      const cashTransaction = await this.cashTransactionService.findByPaymentId(
        payment.id,
      );
      if (cashTransaction) {
        await this.cashTransactionService.reverseCashTransaction(
          cashTransaction.id,
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
      if (payment.paymentMethod === PaymentMethod.WALLET) {
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
      } else if (payment.paymentMethod === PaymentMethod.CASH) {
        // Reverse cash transaction if exists
        const cashTransaction =
          await this.cashTransactionService.findByPaymentId(payment.id);
        if (cashTransaction) {
          await this.cashTransactionService.reverseCashTransaction(
            cashTransaction.id,
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
      paymentMethod: PaymentMethod.EXTERNAL, // External payment gateway
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
    gatewayType: PaymentGatewayType,
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
   * Static helper methods for payment logic
   */
  static isAsyncPaymentMethod(method: PaymentMethod): boolean {
    return method === PaymentMethod.EXTERNAL;
  }

  static isAsyncPayment(payment: Payment): boolean {
    return PaymentService.isAsyncPaymentMethod(payment.paymentMethod);
  }

  static getDefaultStatusForPaymentMethod(
    method: PaymentMethod,
  ): PaymentStatus {
    return PaymentService.isAsyncPaymentMethod(method)
      ? PaymentStatus.PENDING
      : PaymentStatus.COMPLETED;
  }
}
