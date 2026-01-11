import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { FinanceErrors } from '../exceptions/finance.errors';

@Injectable()
export class WalletRepository extends BaseRepository<Wallet> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Wallet {
    return Wallet;
  }

  /**
   * Find wallet by owner ID and type
   */
  async findByOwner(
    ownerId: string,
    ownerType: WalletOwnerType,
  ): Promise<Wallet | null> {
    return this.getRepository().findOne({
      where: { ownerId, ownerType },
    });
  }

  /**
   * Find wallet with pessimistic write lock for balance updates
   */
  async findOneWithLock(walletId: string): Promise<Wallet> {
    const wallet = await this.getRepository().findOne({
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      throw FinanceErrors.walletNotFound();
    }
    return wallet;
  }

  /**
   * Save wallet entity
   */
  async saveWallet(wallet: Wallet): Promise<Wallet> {
    return this.getRepository().save(wallet);
  }

  /**
   * Update wallet balance (should be used within a transaction with pessimistic locking)
   */
  async updateBalance(
    walletId: string,
    balance: Wallet['balance'],
  ): Promise<Wallet> {
    const wallet = await this.findOneOrThrow(walletId);
    wallet.balance = balance;
    return this.saveWallet(wallet);
  }

  /**
   * Create query builder for complex queries
   */
  createQueryBuilder(alias: string): SelectQueryBuilder<Wallet> {
    return this.getRepository().createQueryBuilder(alias);
  }
}
