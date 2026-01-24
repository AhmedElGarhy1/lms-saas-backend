import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { randomUUID } from 'crypto';
import { Payment } from '../entities/payment.entity';
import {
  ExecutePaymentRequest,
  ExecutePaymentResponse,
} from './payment.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaymentCreatorService } from './payment-creator.service';
import { PaymentExecutorService } from './payment-executor.service';
import { PaymentRefundService } from './payment-refund.service';
import { ExternalPaymentService } from './external-payment.service';
import { PaymentQueryService } from './payment-query.service';
import { PaymentService } from './payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Money } from '@/shared/common/utils/money.util';
import {
  PaymentGatewayType,
  PaymentGatewayMethod,
} from '../adapters/interfaces/payment-gateway.interface';

@Injectable()
export class PaymentOrchestratorService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentCreator: PaymentCreatorService,
    private readonly paymentExecutor: PaymentExecutorService,
    private readonly paymentRefunder: PaymentRefundService,
    private readonly externalPaymentService: ExternalPaymentService,
    private readonly paymentQuery: PaymentQueryService,
  ) {}

  /**
   * Main orchestration method for creating and executing payments
   * This is the primary entry point for all payment operations
   */
  @Transactional()
  async createAndExecutePayment(
    request: ExecutePaymentRequest,
    actor: ActorUser,
  ): Promise<ExecutePaymentResponse> {
    this.logger.log(
      `Orchestrating payment: ${request.amount.toString()} from ${request.senderId} to ${request.receiverId}`,
    );

    // Step 1: Create payment record (includes validation and locking)
    const payment = await this.paymentCreator.createPayment(request, actor);

    // Step 2: Execute financial operations
    const executionResult = await this.paymentExecutor.executePayment(payment);

    // Step 3: Complete payment (for sync payments that complete immediately)
    const completedPayment = !PaymentService.isAsyncPayment(payment)
      ? await this.completeExecutedPayment(payment)
      : payment;

    // Step 4: Log success
    this.logPaymentExecution(completedPayment);

    // Step 6: Return comprehensive response
    return {
      payment: completedPayment,
      transactions: executionResult.transactions,
      cashTransactions: executionResult.cashTransactions,
      executionDetails: {
        walletOperations:
          executionResult.transactions.length > 0
            ? {
                senderWalletUpdated: true,
                receiverWalletUpdated: true,
              }
            : undefined,
        cashOperations:
          executionResult.cashTransactions &&
          executionResult.cashTransactions.length > 0
            ? {
                cashboxUpdated: true,
              }
            : undefined,
      },
    };
  }

  /**
   * Orchestrate payment refund operations
   */
  @Transactional()
  async refundPayment(
    paymentId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refundAmount?: Money,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    reason?: string,
  ): Promise<{
    payment: Payment;
    refund: { success: boolean; transactionId: string };
  }> {
    // For external payments, delegate to refund service
    const payment = await this.paymentQuery.getPayment(paymentId);
    if (PaymentService.isAsyncPayment(payment)) {
      const refundedPayment =
        await this.paymentRefunder.refundExternalPayment(paymentId);
      return {
        payment: refundedPayment,
        refund: { success: true, transactionId: payment.id },
      };
    }

    // For internal payments, use the internal refund method
    const refundedPayment =
      await this.paymentRefunder.refundInternalPayment(paymentId);
    return {
      payment: refundedPayment,
      refund: { success: true, transactionId: payment.id },
    };
  }

  /**
   * Orchestrate external payment initiation
   */
  async initiateExternalPayment(
    amount: Money,
    senderId: string,
    actor: ActorUser,
    currency: string = 'EGP',
    description?: string,
    gatewayType?: PaymentGatewayType,
    idempotencyKey?: string,
    methodType?: PaymentGatewayMethod,
  ): Promise<{
    payment: Payment;
    checkoutUrl: string;
    gatewayPaymentId: string;
  }> {
    return await this.externalPaymentService.initiateExternalPayment(
      {
        amount,
        senderId,
        senderType: WalletOwnerType.USER_PROFILE,
        receiverId: senderId, // For top-ups, receiver is same as sender
        receiverType: WalletOwnerType.USER_PROFILE,
        reason: PaymentReason.TOPUP,
        paymentMethod: PaymentMethod.EXTERNAL,
        idempotencyKey,
        correlationId: randomUUID(),
        metadata: {
          gatewayType,
          currency,
          description,
          methodType,
        },
      },
      actor,
    );
  }

  /**
   * Orchestrate external payment completion
   */
  async completeExternalPayment(
    paymentId: string,
    gatewayReference?: string,
  ): Promise<Payment> {
    return await this.externalPaymentService.completeExternalPayment(
      paymentId,
      gatewayReference,
    );
  }

  /**
   * Orchestrate payment cancellation
   */
  async cancelPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentQuery.getPayment(paymentId);

    // Handle different cancellation scenarios based on payment type and status
    if (PaymentService.isAsyncPayment(payment)) {
      return await this.externalPaymentService.failExternalPayment(
        paymentId,
        'Payment cancelled by user',
      );
    }

    // For internal payments, delegate to refund service
    return await this.paymentRefunder.refundInternalPayment(paymentId);
  }

  /**
   * Complete an executed payment (internal payments only)
   */
  private async completeExecutedPayment(payment: Payment): Promise<Payment> {
    // Only complete sync payments immediately
    // Async payments remain PENDING until confirmed by provider
    if (!PaymentService.isAsyncPayment(payment)) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
    }

    // Save updated payment
    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Log payment execution for monitoring
   */
  private logPaymentExecution(payment: Payment): void {
    this.logger.log(`Payment executed successfully`, {
      paymentId: payment.id,
      amount: payment.amount.toNumber(),
      senderId: payment.senderId,
      receiverId: payment.receiverId,
    });
  }
}
