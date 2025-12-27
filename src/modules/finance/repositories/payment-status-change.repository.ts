import { Injectable } from '@nestjs/common';
import { PaymentStatusChange } from '../entities/payment-status-change.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class PaymentStatusChangeRepository extends BaseRepository<PaymentStatusChange> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof PaymentStatusChange {
    return PaymentStatusChange;
  }

  /**
   * Find all status changes for a payment
   */
  async findByPaymentId(paymentId: string): Promise<PaymentStatusChange[]> {
    return this.getRepository()
      .createQueryBuilder('change')
      .where('change.paymentId = :paymentId', { paymentId })
      .leftJoinAndSelect('change.changedByUser', 'changedByUser')
      .orderBy('change.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find status changes by user (for audit)
   */
  async findByUserId(userId: string): Promise<PaymentStatusChange[]> {
    return this.getRepository()
      .createQueryBuilder('change')
      .where('change.changedByUserId = :userId', { userId })
      .leftJoinAndSelect('change.payment', 'payment')
      .orderBy('change.createdAt', 'DESC')
      .getMany();
  }
}
