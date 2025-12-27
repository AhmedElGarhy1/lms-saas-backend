import { Injectable } from '@nestjs/common';
import { Payment } from '../entities/payment.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { SelectQueryBuilder } from 'typeorm';

@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Payment {
    return Payment;
  }

  /**
   * Find payments by status
   */
  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    return this.getRepository().find({
      where: { status } as any,
    });
  }

  /**
   * Find payment by reference type and ID
   */
  async findByReference(
    referenceType: PaymentReferenceType,
    referenceId: string,
  ): Promise<Payment | null> {
    return this.getRepository().findOne({
      where: { referenceType, referenceId } as any,
    });
  }

  /**
   * Find payments by correlation ID (for split payments)
   */
  async findByCorrelationId(correlationId: string): Promise<Payment[]> {
    return this.getRepository().find({
      where: { correlationId } as any,
    });
  }

  /**
   * Find payments by idempotency key and payer profile ID
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    payerProfileId: string,
  ): Promise<Payment[]> {
    return this.getRepository().find({
      where: { idempotencyKey, payerProfileId } as any,
    });
  }

  /**
   * Find payment by gateway payment ID
   */
  async findByGatewayPaymentId(gatewayPaymentId: string): Promise<Payment | null> {
    return this.getRepository().findOne({
      where: {
        metadata: {
          gatewayPaymentId,
        } as any,
      } as any,
    });
  }

  /**
   * Save payment entity
   */
  async savePayment(payment: Payment): Promise<Payment> {
    return this.getRepository().save(payment);
  }

  /**
   * Create query builder for pagination
   */
  createQueryBuilder(alias: string): SelectQueryBuilder<Payment> {
    return this.getRepository().createQueryBuilder(alias);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<void> {
    await this.getRepository().update(paymentId, { status });
  }
}

