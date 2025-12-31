import { Injectable } from '@nestjs/common';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class CashTransactionRepository extends BaseRepository<CashTransaction> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof CashTransaction {
    return CashTransaction;
  }

  /**
   * Find cash transactions by cashbox ID
   */
  async findByCashbox(cashboxId: string): Promise<CashTransaction[]> {
    return this.getRepository().find({
      where: { cashboxId } as any,
    });
  }

  /**
   * Find cash transactions by branch ID
   */
  async findByBranch(branchId: string): Promise<CashTransaction[]> {
    return this.getRepository().find({
      where: { branchId } as any,
    });
  }
}
