import { Injectable } from '@nestjs/common';
import { Payment } from '../entities/payment.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { SelectQueryBuilder } from 'typeorm';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';

// Define type for payment with computed name fields
type PaymentWithNames = Payment & {
  senderName: string;
  receiverName: string;
  senderProfileId?: string;
  senderUserId?: string;
  receiverProfileId?: string;
  receiverUserId?: string;
};

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
      where: { status },
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
      where: { referenceType, referenceId },
    });
  }

  /**
   * Find payments by correlation ID (for split payments)
   */
  async findByCorrelationId(correlationId: string): Promise<Payment[]> {
    return this.getRepository().find({
      where: { correlationId },
    });
  }

  /**
   * Find payments by idempotency key and sender ID
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    senderId: string,
  ): Promise<Payment[]> {
    return this.getRepository().find({
      where: { idempotencyKey, senderId },
    });
  }

  /**
   * Find payment by gateway payment ID
   */
  async findByGatewayPaymentId(
    gatewayPaymentId: string,
  ): Promise<Payment | null> {
    return this.getRepository().findOne({
      where: {
        metadata: {
          gatewayPaymentId,
        },
      },
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
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
  ): Promise<void> {
    await this.getRepository().update(paymentId, { status });
  }

  /**
   * Get user payments statement with enhanced data including names - query-based pagination
   */
