import { Injectable } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { PaginateTransactionDto } from '../dto/paginate-transaction.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { Money } from '@/shared/common/utils/money.util';
import { UserWalletStatementItemDto } from '../dto/wallet-statement.dto';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';

/**
 * Transaction with signed amount for statement calculations
 */
export interface TransactionStatement {
  id: string;
  fromWalletId?: string;
  toWalletId?: string;
  amount: Money; // Original amount (always positive)
  signedAmount: Money; // Signed amount: negative if fromWalletId matches, positive if toWalletId matches
  balanceAfter: Money; // Wallet balance after this transaction
  type: string;
  correlationId: string;
  createdAt: Date;
}

// Define type for transaction with computed name fields
type TransactionWithNames = Transaction & {
  fromName?: string;
  toName?: string;
  fromUserId?: string;
  toUserId?: string;
};

@Injectable()
export class TransactionRepository extends BaseRepository<Transaction> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Transaction {
    return Transaction;
  }

  /**
   * Find transactions by wallet ID (either from or to)
   */
  async findByWallet(walletId: string): Promise<Transaction[]> {
    return this.getRepository().find({
      where: [{ fromWalletId: walletId }, { toWalletId: walletId }],
    });
  }

  /**
   * Get wallet statement with signed amounts for easier balance calculations
   * Transactions where wallet is fromWalletId are negative
   * Transactions where wallet is toWalletId are positive
   */
  async getWalletStatement(walletId: string): Promise<TransactionStatement[]> {
    const transactions = await this.findByWallet(walletId);

    return transactions.map((tx) => {
      // Sign convention: negative if wallet is sender, positive if receiver
      const signedAmount =
        tx.fromWalletId === walletId
          ? tx.amount.multiply(-1) // Outgoing: negative
          : tx.amount; // Incoming: positive

      return {
        id: tx.id,
        fromWalletId: tx.fromWalletId || undefined,
        toWalletId: tx.toWalletId || undefined,
        amount: tx.amount, // Original amount (always positive)
        signedAmount, // Signed amount for calculations
        balanceAfter: tx.balanceAfter, // Balance snapshot
        type: tx.type,
        correlationId: tx.correlationId,
        createdAt: tx.createdAt,
      };
    });
  }

  /**
   * Find transactions by correlation ID (for split payments)
   */
  async findByCorrelationId(correlationId: string): Promise<Transaction[]> {
    return this.getRepository().find({
      where: { correlationId },
    });
  }

  /**
   * Find all transactions for a payment (including fee transactions)
   */
  async findByPaymentId(paymentId: string): Promise<Transaction[]> {
    return this.getRepository().find({
      where: { paymentId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get paginated wallet statement with signed amounts for easier balance calculations
   * Transactions where wallet is fromWalletId are negative
   * Transactions where wallet is toWalletId are positive
   */
  async getWalletStatementPaginated(
    walletId: string,
    dto: PaginateTransactionDto,
  ): Promise<Pagination<TransactionStatement>> {
    // Build query with proper database-level filtering and pagination
    const queryBuilder = this.getRepository()
      .createQueryBuilder('transaction')
      .where(
        'transaction.fromWalletId = :walletId OR transaction.toWalletId = :walletId',
        {
          walletId,
        },
      );

    // Apply filters at database level
    if (dto.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: dto.type });
    }

    // Apply date range filters
    if (dto.dateFrom) {
      queryBuilder.andWhere('transaction.createdAt >= :dateFrom', {
        dateFrom: dto.dateFrom,
      });
    }

    if (dto.dateTo) {
      queryBuilder.andWhere('transaction.createdAt <= :dateTo', {
        dateTo: dto.dateTo,
      });
    }

    // Apply sorting (default: createdAt DESC)
    const sortField = dto.sortBy?.[0]?.[0] || 'createdAt';
    const sortOrder = dto.sortBy?.[0]?.[1] || 'DESC';
    queryBuilder.orderBy(`transaction.${sortField}`, sortOrder);

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const transactions = await queryBuilder.getMany();

    // Transform to TransactionStatement format
    const transformedItems = transactions.map((tx: Transaction) => {
      // Sign convention: negative if wallet is sender, positive if receiver
      const signedAmount =
        tx.fromWalletId === walletId
          ? tx.amount.multiply(-1) // Outgoing: negative
          : tx.amount; // Incoming: positive

      return {
        id: tx.id,
        fromWalletId: tx.fromWalletId || undefined,
        toWalletId: tx.toWalletId || undefined,
        amount: tx.amount, // Original amount (always positive)
        signedAmount, // Signed amount for calculations
        balanceAfter: tx.balanceAfter, // Balance snapshot
        type: tx.type,
        correlationId: tx.correlationId,
        createdAt: tx.createdAt,
      };
    });

    return {
      items: transformedItems,
      meta: {
        totalItems: total,
        itemCount: transformedItems.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
      links: {
        first: '',
        previous: '',
        next: '',
        last: '',
      },
    };
  }

  /**
   * Get user wallet statement with enhanced data including names - query-based pagination
   *
   * IMPORTANT: This method intentionally includes deleted related entities (branches, centers, user profiles)
   * for auditability purposes. Financial records must remain visible even when related entities are soft-deleted
   * to maintain a complete audit trail. Raw table joins are used which don't automatically filter soft-deleted entities.
   */
  async getUserWalletStatementPaginated(
    walletId: string,
    dto: PaginateTransactionDto,
  ): Promise<Pagination<UserWalletStatementItemDto>> {
    // Build query with joins to get transaction and user name information
    // Include deleted entities for auditability - financial records must remain visible
    const queryBuilder = this.getRepository()
      .manager.createQueryBuilder(Transaction, 't')
      .withDeleted()
      .leftJoin('wallets', 'fw', 't.fromWalletId = fw.id')
      .leftJoin('wallets', 'tw', 't.toWalletId = tw.id')
      // From side: user profiles
      .leftJoin(
        'user_profiles',
        'fromProfile',
        'fw.ownerId = fromProfile.id AND fw.ownerType = :userProfileType',
        { userProfileType: 'USER_PROFILE' },
      )
      .leftJoin('users', 'fromUser', 'fromProfile.userId = fromUser.id')
      // From side: branches
      .leftJoin(
        'branches',
        'fromBranch',
        'fw.ownerId = fromBranch.id AND fw.ownerType = :branchType',
      )
      .leftJoin('centers', 'fromCenter', 'fromBranch.centerId = fromCenter.id')
      // To side: user profiles
      .leftJoin(
        'user_profiles',
        'toProfile',
        'tw.ownerId = toProfile.id AND tw.ownerType = :userProfileType',
        { userProfileType: 'USER_PROFILE' },
      )
      .leftJoin('users', 'toUser', 'toProfile.userId = toUser.id')
      // To side: branches
      .leftJoin(
        'branches',
        'toBranch',
        'tw.ownerId = toBranch.id AND tw.ownerType = :branchType',
      )
      .leftJoin('centers', 'toCenter', 'toBranch.centerId = toCenter.id')
      .where('(t.fromWalletId = :walletId OR t.toWalletId = :walletId)', {
        walletId,
      })
      // Select human-readable names with SYSTEM type handling
      // Check both ownerType and ownerId to handle system wallet
      // Handle NULL wallet case by checking if wallet exists first
      .addSelect(
        "COALESCE(CASE WHEN fw.ownerType = 'SYSTEM' OR fw.ownerId = :systemUserId THEN 'System' WHEN fw.ownerType = 'USER_PROFILE' THEN fromUser.name WHEN fw.ownerType = 'BRANCH' THEN CONCAT(fromCenter.name, CONCAT(' - ', fromBranch.city)) WHEN fw.id IS NULL THEN 'N/A' ELSE 'N/A' END, 'N/A')",
        'fromName',
      )
      .addSelect('fromUser.id', 'fromUserId')
      .addSelect(
        "COALESCE(CASE WHEN tw.ownerType = 'SYSTEM' OR tw.ownerId = :systemUserId THEN 'System' WHEN tw.ownerType = 'USER_PROFILE' THEN toUser.name WHEN tw.ownerType = 'BRANCH' THEN CONCAT(toCenter.name, CONCAT(' - ', toBranch.city)) WHEN tw.id IS NULL THEN 'N/A' ELSE 'N/A' END, 'N/A')",
        'toName',
      )
      .addSelect('toUser.id', 'toUserId')
      .setParameters({
        walletId,
        userProfileType: 'USER_PROFILE',
        branchType: 'BRANCH',
        systemUserId: SYSTEM_USER_ID,
      });

    // Apply filters from dto
    if (dto.type) {
      queryBuilder.andWhere('t.type = :type', { type: dto.type });
    }

    // Apply date filters
    if (dto.dateFrom) {
      queryBuilder.andWhere('t.createdAt >= :dateFrom', {
        dateFrom: dto.dateFrom,
      });
    }
    if (dto.dateTo) {
      queryBuilder.andWhere('t.createdAt < :dateTo', {
        dateTo: dto.dateTo,
      });
    }

    // Get paginated results with computed fields using the repository's paginate method
    const result = (await this.paginate(
      dto,
      {
        searchableColumns: [],
        sortableColumns: ['createdAt', 'type', 'amount'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '',
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (
          entity: Transaction,
          raw: any,
        ): TransactionWithNames => {
          // Add computed name fields from joined data
          return {
            ...entity,
            fromName: raw.fromName,
            toName: raw.toName,
            fromUserId: raw.fromUserId,
            toUserId: raw.toUserId,
          } as TransactionWithNames;
        },
      },
    )) as Pagination<TransactionWithNames>;

    // Transform to UserWalletStatementItemDto
    const items: UserWalletStatementItemDto[] = result.items.map(
      (transaction: TransactionWithNames) => {
        // Sign convention: negative if wallet is sender, positive if receiver
        const signedAmount =
          transaction.fromWalletId === walletId
            ? transaction.amount.multiply(-1) // Outgoing: negative
            : transaction.amount; // Incoming: positive

        // Determine user's role in the transaction
        const userRole: 'sender' | 'receiver' =
          transaction.fromWalletId === walletId ? 'sender' : 'receiver';

        return {
          id: transaction.id,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          fromWalletId: transaction.fromWalletId,
          toWalletId: transaction.toWalletId,
          amount: transaction.amount.toNumber(),
          signedAmount: signedAmount.toNumber(),
          balanceAfter: transaction.balanceAfter.toNumber(),
          type: transaction.type,
          correlationId: transaction.correlationId,
          fromName: transaction.fromName,
          toName: transaction.toName,
          userRole,
        };
      },
    );

    return {
      ...result,
      items,
    };
  }

  /**
   * Unified wallet statement implementation - single source of truth
   * Handles both USER_PROFILE and BRANCH wallet owners, avoids transaction duplicates
   *
   * IMPORTANT: This method intentionally includes deleted related entities (branches, centers, user profiles)
   * for auditability purposes. Financial records must remain visible even when related entities are soft-deleted
   * to maintain a complete audit trail. Raw table joins are used which don't automatically filter soft-deleted entities.
   */
  async getUnifiedWalletStatementPaginated(
    walletId: string,
    dto: PaginateTransactionDto,
  ): Promise<Pagination<UserWalletStatementItemDto>> {
    // Include deleted entities for auditability - financial records must remain visible
    const queryBuilder = this.getRepository()
      .manager.createQueryBuilder(Transaction, 't')
      .withDeleted()
      .leftJoin('wallets', 'fw', 't.fromWalletId = fw.id')
      .leftJoin('wallets', 'tw', 't.toWalletId = tw.id')

      // From side: user profiles
      .leftJoin(
        'user_profiles',
        'fromUserProfile',
        'fw.ownerId = fromUserProfile.id AND fw.ownerType = :userProfileType',
      )
      .leftJoin('users', 'fromUser', 'fromUserProfile.userId = fromUser.id')

      // From side: branches
      .leftJoin(
        'branches',
        'fromBranch',
        'fw.ownerId = fromBranch.id AND fw.ownerType = :branchType',
      )
      .leftJoin('centers', 'fromCenter', 'fromBranch.centerId = fromCenter.id')

      // To side: user profiles
      .leftJoin(
        'user_profiles',
        'toUserProfile',
        'tw.ownerId = toUserProfile.id AND tw.ownerType = :userProfileType',
      )
      .leftJoin('users', 'toUser', 'toUserProfile.userId = toUser.id')

      // To side: branches
      .leftJoin(
        'branches',
        'toBranch',
        'tw.ownerId = toBranch.id AND tw.ownerType = :branchType',
      )
      .leftJoin('centers', 'toCenter', 'toBranch.centerId = toCenter.id')

      // Optimized WHERE condition: avoid duplicates by showing only one side per transaction
      // For the target wallet, show transactions where it's the recipient (positive amount)
      // OR where it's the sender but amount is negative (indicating outgoing)
      .where(
        `
          ((t.toWalletId = :walletId AND t.amount > 0)
           OR
           (t.fromWalletId = :walletId AND t.amount < 0))
        `,
        { walletId },
      )

      // Use COALESCE to get names from either users or branches, with SYSTEM type handling
      // Check both ownerType and ownerId to handle system wallet
      // Handle NULL wallet case by checking if wallet exists first
      .addSelect(
        "COALESCE(CASE WHEN fw.ownerType = 'SYSTEM' OR fw.ownerId = :systemUserId THEN 'System' WHEN fw.ownerType = 'USER_PROFILE' THEN fromUser.name WHEN fw.ownerType = 'BRANCH' THEN CONCAT(fromCenter.name, CONCAT(' - ', fromBranch.city)) WHEN fw.id IS NULL THEN 'N/A' ELSE 'N/A' END, 'N/A')",
        'fromName',
      )
      .addSelect(
        "COALESCE(CASE WHEN tw.ownerType = 'SYSTEM' OR tw.ownerId = :systemUserId THEN 'System' WHEN tw.ownerType = 'USER_PROFILE' THEN toUser.name WHEN tw.ownerType = 'BRANCH' THEN CONCAT(toCenter.name, CONCAT(' - ', toBranch.city)) WHEN tw.id IS NULL THEN 'N/A' ELSE 'N/A' END, 'N/A')",
        'toName',
      )

      .setParameters({
        systemUserId: SYSTEM_USER_ID,
        walletId,
        userProfileType: WalletOwnerType.USER_PROFILE,
        branchType: WalletOwnerType.BRANCH,
      });

    // Apply filters
    if (dto.type) {
      queryBuilder.andWhere('t.type = :type', { type: dto.type });
    }

    // Apply date filters
    if (dto.dateFrom) {
      queryBuilder.andWhere('t.createdAt >= :dateFrom', {
        dateFrom: dto.dateFrom,
      });
    }
    if (dto.dateTo) {
      queryBuilder.andWhere('t.createdAt < :dateTo', {
        dateTo: dto.dateTo,
      });
    }

    // Get paginated results with computed fields using the repository's paginate method
    const result = (await this.paginate(
      dto,
      {
        searchableColumns: [],
        sortableColumns: ['createdAt', 'type', 'amount'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '',
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (
          entity: Transaction,
          raw: any,
        ): TransactionWithNames => {
          // Explicitly handle null/undefined/empty string to ensure we never return null
          return Object.assign(entity, {
            fromName: raw.fromName,
            toName: raw.toName,
          }) as TransactionWithNames;
        },
      },
    )) as Pagination<TransactionWithNames>;

    // Transform to UserWalletStatementItemDto
    const items: UserWalletStatementItemDto[] = result.items.map(
      (transaction: TransactionWithNames) => {
        // Sign convention: negative if wallet is sender, positive if receiver
        const signedAmount =
          transaction.fromWalletId === walletId
            ? transaction.amount.multiply(-1) // Outgoing: negative
            : transaction.amount; // Incoming: positive

        // Determine user's role in the transaction
        const userRole: 'sender' | 'receiver' =
          transaction.fromWalletId === walletId ? 'sender' : 'receiver';

        return {
          id: transaction.id,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          fromWalletId: transaction.fromWalletId,
          toWalletId: transaction.toWalletId,
          amount: transaction.amount.toNumber(),
          signedAmount: signedAmount.toNumber(),
          balanceAfter: transaction.balanceAfter.toNumber(),
          type: transaction.type,
          correlationId: transaction.correlationId,
          fromName:
            transaction.fromName && transaction.fromName.trim()
              ? transaction.fromName
              : 'N/A',
          toName:
            transaction.toName && transaction.toName.trim()
              ? transaction.toName
              : 'N/A',
          userRole,
        };
      },
    );

    return {
      ...result,
      items,
    };
  }
}
