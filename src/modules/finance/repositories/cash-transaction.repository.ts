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

  /**
   * Get cash transaction summary for cashbox within time range
   */
  async getCashSummaryForCashbox(
    cashboxId: string,
    startTime: Date,
    endTime?: Date,
  ): Promise<{
    count: number;
    totalAmount: number;
    transactions: CashTransaction[];
  }> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('ct')
      .where('ct.cashboxId = :cashboxId', { cashboxId })
      .andWhere('ct.createdAt >= :startTime', { startTime });

    if (endTime) {
      queryBuilder.andWhere('ct.createdAt <= :endTime', { endTime });
    }

    // Only count IN transactions (money coming into cashbox)
    queryBuilder.andWhere('ct.direction = :direction', { direction: 'IN' });

    const transactions = await queryBuilder.getMany();

    const count = transactions.length;
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount.toString()),
      0,
    );

    return { count, totalAmount, transactions };
  }

  /**
   * Get cash transaction summary for branch within time range
   */
  async getCashSummaryForBranch(
    branchId: string,
    startTime: Date,
    endTime?: Date,
  ): Promise<{
    count: number;
    totalAmount: number;
    transactions: CashTransaction[];
  }> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('ct')
      .where('ct.branchId = :branchId', { branchId })
      .andWhere('ct.createdAt >= :startTime', { startTime });

    if (endTime) {
      queryBuilder.andWhere('ct.createdAt <= :endTime', { endTime });
    }

    // Only count IN transactions (money coming into cashbox)
    queryBuilder.andWhere('ct.direction = :direction', { direction: 'IN' });

    const transactions = await queryBuilder.getMany();

    const count = transactions.length;
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount.toString()),
      0,
    );

    return { count, totalAmount, transactions };
  }
}
