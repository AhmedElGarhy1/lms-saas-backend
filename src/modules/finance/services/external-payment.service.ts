import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { FinanceErrors } from '../exceptions/finance.errors';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';
import {
  PaymentGatewayType,
  CreatePaymentRequest,
} from '../adapters/interfaces/payment-gateway.interface';
import { WalletService } from './wallet.service';
import { Money } from '@/shared/common/utils/money.util';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { UserService } from '@/modules/user/services/user.service';
import { PaymentService } from './payment.service';

// Define a local interface for external payment initiation
interface InitiateExternalPaymentRequest {
  amount: Money;
  senderId: string;
  senderType: WalletOwnerType;
  receiverId: string;
  receiverType: WalletOwnerType;
  reason: PaymentReason;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ExternalPaymentService {
  private readonly logger = new Logger(ExternalPaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
  ) {}

  /**
   * Initiate an external payment through payment gateway
   */
  @Transactional()
  async initiateExternalPayment(
    request: InitiateExternalPaymentRequest,
    actor: ActorUser,
  ): Promise<{
    payment: Payment;
    checkoutUrl: string;
    gatewayPaymentId: string;
  }> {
    this.logger.log(
      `Initiating external payment for amount ${request.amount.toNumber()}`,
    );

    // Create payment record first
    const payment = await this.paymentRepository.create({
      amount: request.amount,
      senderId: request.senderId,
      senderType: request.senderType,
      receiverId: request.receiverId,
      receiverType: request.receiverType,
      reason: request.reason,
      paymentMethod: request.paymentMethod,
      status: PaymentStatus.PENDING,
      correlationId: request.correlationId,
      metadata: request.metadata,
      createdByProfileId: actor.userProfileId,
    });

    try {
      // Extract gateway configuration from metadata
      const gatewayType =
        request.metadata?.gatewayType || PaymentGatewayType.PAYMOB;
      const currency = request.metadata?.currency || 'EGP';

      const user = await this.userService.findUserByProfileId(
        request.senderId,
        actor,
      );

      // Prepare gateway payment request
      const gatewayRequest: CreatePaymentRequest = {
        amount: request.amount,
        currency: currency,
        orderId: payment.id,
        customerName: user?.name, // Send actual user name
        customerPhone: user?.phone, // Send actual phone number
        description: `${request.reason} - ${request.amount.toString()} ${currency}`,
        metadata: {
          ...request.metadata,
          correlationId: request.correlationId,
          senderId: request.senderId,
          receiverId: request.receiverId,
        },
      };

      // Call payment gateway to initiate payment
      const gatewayResponse = await this.paymentGatewayService.createPayment(
        gatewayRequest,
        gatewayType,
      );

      // Update payment record with gateway information
      payment.referenceType = PaymentReferenceType.GATEWAY_PAYMENT;
      // Note: referenceId is not set for gateway payments as gatewayPaymentId is not a UUID
      // The gateway payment ID is stored in metadata instead

      // Store gateway response in metadata for future reference
      payment.metadata = {
        ...payment.metadata,
        gatewayResponse: {
          gatewayPaymentId: gatewayResponse.gatewayPaymentId,
          clientSecret: gatewayResponse.clientSecret,
          status: gatewayResponse.status,
        },
      };

      // Save updated payment record
      const savedPayment = await this.paymentRepository.savePayment(payment);

      return {
        payment: savedPayment,
        checkoutUrl: gatewayResponse.checkoutUrl,
        gatewayPaymentId: gatewayResponse.gatewayPaymentId,
      };
    } catch (error) {
      // Mark payment as failed if gateway initiation fails
      payment.status = PaymentStatus.CANCELLED;
      await this.paymentRepository.savePayment(payment);
      throw error;
    }
  }

  /**
   * Complete a TEST payment immediately (for development/testing)
   */
  private async completeTestPayment(
    payment: Payment,
    gatewayResponse: any,
  ): Promise<{
    payment: Payment;
    checkoutUrl: string;
    gatewayPaymentId: string;
  }> {
    // For TEST payments, immediately complete the payment
    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();
    payment.referenceType = PaymentReferenceType.GATEWAY_PAYMENT;

    // Store gateway response in metadata
    payment.metadata = {
      ...payment.metadata,
      gatewayResponse: {
        gatewayPaymentId: gatewayResponse.gatewayPaymentId,
        clientSecret: gatewayResponse.clientSecret,
        status: 'completed', // Mark as completed for TEST
      },
    };

    // For wallet top-ups, credit the user's wallet immediately
    if (payment.reason === PaymentReason.TOPUP) {
      // Ensure wallet exists (getWallet creates it if it doesn't) and get the wallet object
      const wallet = await this.walletService.getWallet(
        payment.receiverId,
        WalletOwnerType.USER_PROFILE,
      );

      // Now credit the receiver's wallet using the wallet ID (not the owner ID)
      await this.walletService.updateBalance(
        wallet.id, // Use wallet.id, not payment.receiverId
        payment.amount,
      );
    }

    // Save the completed payment
    const savedPayment = await this.paymentRepository.savePayment(payment);

    return {
      payment: savedPayment,
      checkoutUrl: gatewayResponse.checkoutUrl,
      gatewayPaymentId: gatewayResponse.gatewayPaymentId,
    };
  }

  /**
   * Complete an external payment
   */
  @Transactional()
  async completeExternalPayment(
    paymentId: string,
    gatewayReference?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (!PaymentService.isAsyncPayment(payment)) {
      throw FinanceErrors.invalidPaymentOperation(
        'Cannot complete non-external payment',
      );
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw FinanceErrors.invalidPaymentOperation(
        'Payment is not in pending status',
      );
    }

    // Mark payment as completed
    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();

    if (gatewayReference) {
      payment.referenceId = gatewayReference;
    }

    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Fail an external payment
   */
  @Transactional()
  async failExternalPayment(
    paymentId: string,
    reason?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    if (!PaymentService.isAsyncPayment(payment)) {
      throw FinanceErrors.invalidPaymentOperation(
        'Cannot fail non-external payment',
      );
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw FinanceErrors.invalidPaymentOperation(
        'Payment is not in pending status',
      );
    }

    // Mark payment as failed/cancelled
    payment.status = PaymentStatus.CANCELLED;
    payment.metadata = {
      ...payment.metadata,
      failureReason: reason,
    };

    return await this.paymentRepository.savePayment(payment);
  }

  /**
   * Process external payment completion (typically called by webhooks)
   */
  @Transactional()
  async processExternalPaymentCompletion(
    gatewayReference: string,
    gatewayData: any,
  ): Promise<Payment | null> {
    // Find payment by gateway reference
    const payment =
      await this.paymentRepository.findByGatewayReference(gatewayReference);

    if (!payment) {
      this.logger.warn(
        `Payment not found for gateway reference: ${gatewayReference}`,
      );
      return null;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      this.logger.warn(`Payment ${payment.id} is not in pending status`);
      return payment;
    }

    // Update payment based on gateway response
    if (gatewayData.success) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
    } else {
      payment.status = PaymentStatus.CANCELLED;
    }

    payment.metadata = {
      ...payment.metadata,
      gatewayCompletionData: gatewayData,
    };

    return await this.paymentRepository.savePayment(payment);
  }
}
