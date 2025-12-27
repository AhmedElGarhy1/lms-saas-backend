import { Injectable } from '@nestjs/common';
import { Cashbox } from '../entities/cashbox.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class CashboxRepository extends BaseRepository<Cashbox> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Cashbox {
    return Cashbox;
  }

  /**
   * Find cashbox by branch ID
   */
  async findByBranchId(branchId: string): Promise<Cashbox | null> {
    return this.getRepository().findOne({
      where: { branchId } as any,
    });
  }

  /**
   * Find cashbox with pessimistic write lock for balance updates
   */
  async findOneWithLock(cashboxId: string): Promise<Cashbox> {
    const cashbox = await this.getRepository().findOne({
      where: { id: cashboxId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!cashbox) {
      throw new Error(`Cashbox not found: ${cashboxId}`);
    }
    return cashbox;
  }

  /**
   * Save cashbox entity
   */
  async saveCashbox(cashbox: Cashbox): Promise<Cashbox> {
    return this.getRepository().save(cashbox);
  }

  /**
   * Update cashbox balance (should be used within a transaction with pessimistic locking)
   */
  async updateBalance(
    cashboxId: string,
    balance: Cashbox['balance'],
  ): Promise<Cashbox> {
    const cashbox = await this.findOneOrThrow(cashboxId);
    cashbox.balance = balance;
    return this.saveCashbox(cashbox);
  }
}

