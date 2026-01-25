import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Payment } from '../entities/payment.entity';
import { FinanceErrors } from '../exceptions/finance.errors';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaymentRepository } from '../repositories/payment.repository';
import { ExecutePaymentRequest, PaymentService } from './payment.service';
import { PaymentFeeService } from './payment-fee.service';
import { SettingsService } from '@/modules/settings/services/settings.service';

@Injectable()
export class PaymentCreatorService {
  private readonly logger = new Logger(PaymentCreatorService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentFeeService: PaymentFeeService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Create and validate a payment record
   */
  @Transactional()
  async createPayment(
    request: ExecutePaymentRequest,
    actor: ActorUser,
  ): Promise<Payment> {
    // Idempotency check
    if (request.idempotencyKey) {
      const existingPayments =
        await this.paymentRepository.findByIdempotencyKey(
          request.idempotencyKey,
          request.senderId,
        );

      if (existingPayments.length > 0) {
        return existingPayments[0];
      }
    }

    // Validate request
    // Basic validations
    if (request.amount.isNegative() || request.amount.isZero()) {
      throw FinanceErrors.invalidPaymentAmount();
    }

    // Create payment record - status determined by payment method
    const payment = await this.paymentRepository.create({
      amount: request.amount,
      senderId: request.senderId,
      senderType: request.senderType,
      receiverId: request.receiverId,
      receiverType: request.receiverType,
      reason: request.reason,
      paymentMethod: request.paymentMethod,
      status: PaymentService.getDefaultStatusForPaymentMethod(
        request.paymentMethod,
      ),
      correlationId: request.correlationId,
      metadata: request.metadata,
      referenceType: request.referenceType,
      referenceId: request.referenceId,
      createdByProfileId: actor.userProfileId,
    });

    // Calculate and set fees if applicable
    if (this.paymentFeeService.shouldApplyFee(payment.reason)) {
      const feesPercentage = await this.settingsService.getFees();
      const { feeAmount, netAmount } =
        this.paymentFeeService.calculateFeeAmounts(
          payment.amount,
          feesPercentage,
        );

      // Update payment with fee fields
      await this.paymentRepository.update(payment.id, {
        feeAmount,
        netAmount,
      });

      // Update payment object to reflect fee fields
      payment.feeAmount = feeAmount;
      payment.netAmount = netAmount;
    }

    return payment;
  }
}
