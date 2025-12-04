import { Injectable } from '@nestjs/common';
import { StudentPaymentStrategy } from '../entities/student-payment-strategy.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class StudentPaymentStrategyRepository extends BaseRepository<StudentPaymentStrategy> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof StudentPaymentStrategy {
    return StudentPaymentStrategy;
  }

  async findByClassId(classId: string): Promise<StudentPaymentStrategy | null> {
    return this.getRepository().findOne({
      where: { classId },
    });
  }
}
