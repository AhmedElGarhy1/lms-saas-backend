import { Injectable } from '@nestjs/common';
import { TeacherPaymentStrategy } from '../entities/teacher-payment-strategy.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class TeacherPaymentStrategyRepository extends BaseRepository<TeacherPaymentStrategy> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof TeacherPaymentStrategy {
    return TeacherPaymentStrategy;
  }

  async findByClassId(classId: string): Promise<TeacherPaymentStrategy | null> {
    return this.getRepository().findOne({
      where: { classId },
    });
  }
}
