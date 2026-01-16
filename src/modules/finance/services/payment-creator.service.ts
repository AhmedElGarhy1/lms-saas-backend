import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { Money } from '@/shared/common/utils/money.util';
import { FinanceErrors } from '../exceptions/finance.errors';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaymentRepository } from '../repositories/payment.repository';
import { WalletService } from './wallet.service';
import { ExecutePaymentRequest, PaymentService } from './payment.service';

@Injectable()
export class PaymentCreatorService {
  private readonly logger = new Logger(PaymentCreatorService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly walletService: WalletService,
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
    await this.validatePaymentRequest(request);

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

    return payment;
  }

  /**
   * Validate payment request
   */
  private async validatePaymentRequest(
    request: ExecutePaymentRequest,
  ): Promise<void> {
    // Basic validations
    if (request.amount.isNegative() || request.amount.isZero()) {
      throw FinanceErrors.invalidAmount();
    }

    // Wallet-specific validations
    if (request.paymentMethod === PaymentMethod.WALLET) {
      const senderWallet = await this.walletService.getWallet(
        request.senderId,
        request.senderType,
      );
      console.log('request.senderId', request.senderId);

      if (senderWallet.balance.lessThan(request.amount)) {
        throw FinanceErrors.insufficientWalletBalance();
      }
    }
  }
}
