import { Injectable } from '@nestjs/common';
import { Cashbox } from '../entities/cashbox.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import {
  CenterTreasuryStatsDto,
  CenterRevenueBranchDetailDto,
  CenterStatementItemDto,
  CenterCashStatementItemDto,
} from '../dto/center-revenue-stats.dto';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { Pagination } from '@/shared/common/types/pagination.types';
import { CenterStatementQueryDto } from '../dto/center-statement-query.dto';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';

import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { CashTransactionRepository } from './cash-transaction.repository';
import { TransactionRepository } from './transaction.repository';

// Define type for transaction with computed name fields
type TransactionWithNames = Transaction & {
  fromName?: string;
  toName?: string;
};

// Define type for cash transaction with computed name fields
type CashTransactionWithNames = CashTransaction & {
  paidByName?: string;
  receivedByName: string;
  paidByUserId?: string;
  receivedByUserId: string;
};
@Injectable()
export class CashboxRepository extends BaseRepository<Cashbox> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
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
      where: { branchId },
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
      throw FinanceErrors.cashboxNotFound();
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

  /**
   * Get center treasury statistics including cashbox and wallet balances across all branches
   */
  async getCenterTreasuryStats(
    centerId: string,
    actor: ActorUser,
  ): Promise<CenterTreasuryStatsDto> {
    // Single optimized query to get all branches with their aggregated balances
    const query = this.getRepository()
      .manager.createQueryBuilder()
      .select([
        'b.id as branchId',
        'b.city as branchName',
        'COALESCE(SUM(c.balance), 0) as cashboxBalance',
        'COALESCE(SUM(w.balance), 0) as walletBalance',
      ])
      .from('branches', 'b')
      .leftJoin('cashboxes', 'c', 'c.branchId = b.id')
      .leftJoin(
        'wallets',
        'w',
        'w.ownerId = b.id AND w.ownerType = :branchType',
        { branchType: WalletOwnerType.BRANCH },
      )
      .where('b.centerId = :centerId', { centerId });

    // Check if user can bypass center internal access
    const canBypass =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );

    // Apply branch access filtering only if user cannot bypass
    if (!canBypass) {
      query.andWhere(
        'b.id IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId)',
        { userProfileId: actor.userProfileId },
      );
    }

    query.groupBy('b.id').addGroupBy('b.city').orderBy('b.id');

    const results = await query.getRawMany();

    if (results.length === 0) {
      return {
        total: Money.from(0),
        cashbox: Money.from(0),
        wallet: Money.from(0),
        details: [],
      };
    }

    // Calculate totals and build details
    let totalCashbox = Money.from(0);
    let totalWallet = Money.from(0);
    const details: CenterRevenueBranchDetailDto[] = [];

    for (const result of results) {
      // Note: PostgreSQL returns lowercase column names
      const cashboxBalance = Money.from(result.cashboxbalance || 0);
      const walletBalance = Money.from(result.walletbalance || 0);

      totalCashbox = totalCashbox.add(cashboxBalance);
      totalWallet = totalWallet.add(walletBalance);

      details.push({
        branchId: result.branchid,
        branchName: result.branchname,
        cashbox: cashboxBalance,
        wallet: walletBalance,
      });
    }

    const total = totalCashbox.add(totalWallet);

    return {
      total,
      cashbox: totalCashbox,
      wallet: totalWallet,
      details,
    };
  }

  /**
   * Get center wallet statement - all wallet transactions across branches in center
   *
   * IMPORTANT: This method intentionally includes deleted related entities (branches, centers, user profiles)
   * for auditability purposes. Financial records must remain visible even when related entities are soft-deleted
   * to maintain a complete audit trail. Raw table joins are used which don't automatically filter soft-deleted entities.
   */
  async getCenterStatement(
    centerId: string | undefined,
    query: CenterStatementQueryDto,
    actor: ActorUser,
  ): Promise<Pagination<CenterStatementItemDto>> {
    // Clean query using COALESCE for readable names
    // Include deleted entities for auditability - financial records must remain visible
    let queryBuilder = this.getRepository()
      .manager.createQueryBuilder(Transaction, 'tx')
      .withDeleted()
      .select('tx') // Explicitly select the transaction data
      .leftJoin('wallets', 'fromWallet', 'tx.fromWalletId = fromWallet.id')
      .leftJoin('wallets', 'toWallet', 'tx.toWalletId = toWallet.id')

      // Joins for "From" side
      .leftJoin(
        'user_profiles',
        'fromUserProfile',
        'fromWallet.ownerId = fromUserProfile.id AND fromWallet.ownerType = :userProfileType',
      )
      .leftJoin('users', 'fromUser', 'fromUserProfile.userId = fromUser.id')
      .leftJoin(
        'branches',
        'fromBranch',
        'fromWallet.ownerId = fromBranch.id AND fromWallet.ownerType = :branchType',
      )
      .leftJoin('centers', 'fromCenter', 'fromBranch.centerId = fromCenter.id')

      // Joins for "To" side
      .leftJoin(
        'user_profiles',
        'toUserProfile',
        'toWallet.ownerId = toUserProfile.id AND toWallet.ownerType = :userProfileType',
      )
      .leftJoin('users', 'toUser', 'toUserProfile.userId = toUser.id')
      .leftJoin(
        'branches',
        'toBranch',
        'toWallet.ownerId = toBranch.id AND toWallet.ownerType = :branchType',
      )
      .leftJoin('centers', 'toCenter', 'toBranch.centerId = toCenter.id')

      // Find transactions where branch wallets are involved

      // Explicit condition to return only one transaction record per business transaction
      // and ensure balanceAfter represents branch wallet balance
      .where(
        `
           ((toWallet.ownerId = toBranch.id AND toWallet.ownerType = :branchType AND tx.amount > 0)
            OR
            (fromWallet.ownerId = fromBranch.id AND fromWallet.ownerType = :branchType AND tx.amount < 0))`,
      )

      // Select human-readable names with SYSTEM type handling
      .addSelect(
        "COALESCE(CASE WHEN fromWallet.ownerType = 'SYSTEM' OR fromWallet.ownerId = :systemUserId THEN 'System' WHEN fromWallet.ownerType = 'USER_PROFILE' THEN fromUser.name WHEN fromWallet.ownerType = 'BRANCH' THEN CONCAT(fromCenter.name, CONCAT(' - ', fromBranch.city)) ELSE NULL END, 'N/A')",
        'from_name',
      )
      .addSelect(
        "COALESCE(CASE WHEN toWallet.ownerType = 'SYSTEM' OR toWallet.ownerId = :systemUserId THEN 'System' WHEN toWallet.ownerType = 'USER_PROFILE' THEN toUser.name WHEN toWallet.ownerType = 'BRANCH' THEN CONCAT(toCenter.name, CONCAT(' - ', toBranch.city)) ELSE NULL END, 'N/A')",
        'to_name',
      )

      .setParameters({
        ...(centerId && { centerId }),
        branchType: WalletOwnerType.BRANCH,
        userProfileType: WalletOwnerType.USER_PROFILE,
        systemUserId: SYSTEM_USER_ID,
        ...(query.branchId && { branchId: query.branchId }),
      });

    if (centerId) {
      queryBuilder = queryBuilder.andWhere(
        '(fromBranch.centerId = :centerId OR toBranch.centerId = :centerId)',
        { centerId },
      );

      // Check if user can bypass center internal access
      const canBypass =
        await this.accessControlHelperService.bypassCenterInternalAccess(
          actor.userProfileId,
          centerId,
        );

      // Apply branch access filtering only if user cannot bypass
      if (!canBypass) {
        queryBuilder = queryBuilder.andWhere(
          '(fromBranch.id IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId) OR toBranch.id IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId))',
          { userProfileId: actor.userProfileId },
        );
      }
    }

    // Optional branch filter
    if (query.branchId) {
      queryBuilder = queryBuilder.andWhere(
        '(fromBranch.id = :branchId OR toBranch.id = :branchId)',
        { branchId: query.branchId },
      );
    }

    // Apply transaction type filter
    if (query.type) {
      queryBuilder = queryBuilder.andWhere('tx.type = :type', {
        type: query.type,
      });
    }

    // Get paginated results with computed fields (names) using TransactionRepository
    const transactionRepo = new TransactionRepository(this.txHost);
    const result = (await transactionRepo.paginate(
      query,
      {
        searchableColumns: [], // No search for transactions
        sortableColumns: ['createdAt', 'type', 'amount'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '', // Empty route - no links needed
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (
          entity: Transaction,
          raw: any,
        ): TransactionWithNames => {
          // Add computed name fields from COALESCE results
          // Explicitly handle null/undefined to ensure we never return null
          return {
            ...entity,
            fromName: raw.from_name ?? 'N/A',
            toName: raw.to_name ?? 'N/A',
          } as TransactionWithNames;
        },
      },
    )) as Pagination<TransactionWithNames>;

    // Transform to CenterStatementItemDto
    const items: CenterStatementItemDto[] = result.items.map(
      (transaction: TransactionWithNames) => ({
        id: transaction.id,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        createdByProfileId: transaction.createdByProfileId,
        updatedByProfileId: transaction.updatedByProfileId,
        fromWalletId: transaction.fromWalletId,
        toWalletId: transaction.toWalletId,
        amount: transaction.amount.toNumber(),
        type: transaction.type,
        correlationId: transaction.correlationId,
        balanceAfter: transaction.balanceAfter.toNumber(),
        fromName: transaction.fromName ?? 'N/A',
        toName: transaction.toName ?? 'N/A',
      }),
    );

    return {
      ...result,
      items,
    };
  }

  /**
   * Get center cash statement - all cash transactions across branches in center
   *
   * IMPORTANT: This method intentionally includes deleted related entities (branches, centers, user profiles)
   * for auditability purposes. Financial records must remain visible even when related entities are soft-deleted
   * to maintain a complete audit trail. Raw table joins are used which don't automatically filter soft-deleted entities.
   */
  async getCenterCashStatement(
    centerId: string | undefined,
    query: CenterStatementQueryDto,
    actor: ActorUser,
  ): Promise<Pagination<CenterCashStatementItemDto>> {
    // Build query with joins to get cash transaction and name information
    // Include deleted entities for auditability - financial records must remain visible
    let queryBuilder = this.getRepository()
      .manager.createQueryBuilder(CashTransaction, 'ct')
      .withDeleted()
      .leftJoin('branches', 'b', 'ct.branchId = b.id')
      // Join for paidByProfileId names (users)
      .leftJoin(
        'user_profiles',
        'paidByProfile',
        'ct.paidByProfileId = paidByProfile.id',
      )
      .leftJoin('users', 'paidByUser', 'paidByProfile.userId = paidByUser.id')
      // Join for receivedByProfileId names (users)
      .leftJoin(
        'user_profiles',
        'receivedByProfile',
        'ct.receivedByProfileId = receivedByProfile.id',
      )
      .leftJoin(
        'users',
        'receivedByUser',
        'receivedByProfile.userId = receivedByUser.id',
      )
      // Select human-readable names
      .addSelect('paidByUser.name', 'paidByName')
      .addSelect('paidByUser.id', 'paidByUserId')
      .addSelect('receivedByUser.name', 'receivedByName')
      .addSelect('receivedByUser.id', 'receivedByUserId');

    if (centerId) {
      queryBuilder = queryBuilder.andWhere('b.centerId = :centerId', {
        centerId,
      });

      // Check if user can bypass center internal access
      const canBypass =
        await this.accessControlHelperService.bypassCenterInternalAccess(
          actor.userProfileId,
          centerId,
        );

      // Apply branch access filtering only if user cannot bypass
      if (!canBypass) {
        queryBuilder = queryBuilder.andWhere(
          'b.id IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId)',
          { userProfileId: actor.userProfileId },
        );
      }
    }

    // Optional branch filter
    if (query.branchId) {
      queryBuilder = queryBuilder.andWhere('b.id = :branchId', {
        branchId: query.branchId,
      });
    }

    // Apply filters from query (which extends PaginateTransactionDto)
    if (query.type) {
      queryBuilder = queryBuilder.andWhere('ct.type = :type', {
        type: query.type,
      });
    }

    // Get paginated results with computed fields (names) using CashTransactionRepository
    const cashTransactionRepo = new CashTransactionRepository(this.txHost);
    const result = (await cashTransactionRepo.paginate(
      query,
      {
        searchableColumns: [], // No search for cash transactions
        sortableColumns: ['createdAt', 'type', 'amount'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '', // Empty route - no links needed
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (
          entity: CashTransaction,
          raw: any,
        ): CashTransactionWithNames => {
          // Add computed name fields from joined data
          return {
            ...entity,
            paidByName: raw.paidByName,
            receivedByName: raw.receivedByName,
            paidByUserId: raw.paidByUserId,
            receivedByUserId: raw.receivedByUserId,
          } as CashTransactionWithNames;
        },
      },
    )) as Pagination<CashTransactionWithNames>;

    // Transform to CenterCashStatementItemDto
    const items: CenterCashStatementItemDto[] = result.items.map(
      (transaction: CashTransactionWithNames) => ({
        id: transaction.id,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        branchId: transaction.branchId,
        cashboxId: transaction.cashboxId,
        amount: transaction.amount.toNumber(),
        direction: transaction.direction,
        type: transaction.type,
        balanceAfter: transaction.balanceAfter.toNumber(),
        paidByProfileId: transaction.paidByProfileId,
        receivedByProfileId: transaction.receivedByProfileId,
        paidByName: transaction.paidByName,
        receivedByName: transaction.receivedByName,
      }),
    );

    return {
      ...result,
      items,
    };
  }
}
