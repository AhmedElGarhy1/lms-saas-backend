import { Injectable } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { PaginateTransactionDto } from '../dto/paginate-transaction.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { Money } from '@/shared/common/utils/money.util';

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
      where: [{ fromWalletId: walletId }, { toWalletId: walletId }] as any,
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
      where: { correlationId } as any,
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
    // For now, get all transactions and manually paginate
    // TODO: Implement proper query-based pagination for better performance
    const allTransactions = await this.findByWallet(walletId);

    // Apply filters
    let filteredTransactions = allTransactions;
    if (dto.type) {
      filteredTransactions = filteredTransactions.filter(
        (tx) => tx.type === dto.type,
      );
    }
    if (dto.correlationId) {
      filteredTransactions = filteredTransactions.filter(
        (tx) => tx.correlationId === dto.correlationId,
      );
    }

    // Apply date filters
    if (dto.dateFrom) {
      filteredTransactions = filteredTransactions.filter(
        (tx) => tx.createdAt >= dto.dateFrom!,
      );
    }
    if (dto.dateTo) {
      filteredTransactions = filteredTransactions.filter(
        (tx) => tx.createdAt <= dto.dateTo!,
      );
    }

    // Sort (default: createdAt DESC)
    const sortField = dto.sortBy?.[0]?.[0] || 'createdAt';
    const sortOrder = dto.sortBy?.[0]?.[1] || 'DESC';
    filteredTransactions.sort((a, b) => {
      const aVal = a[sortField as keyof Transaction] || 0;
      const bVal = b[sortField as keyof Transaction] || 0;
      if (aVal < bVal) return sortOrder === 'ASC' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    // Manual pagination
    const total = filteredTransactions.length;
    const startIndex = ((dto.page || 1) - 1) * (dto.limit || 10);
    const endIndex = startIndex + (dto.limit || 10);
    const paginatedTransactions = filteredTransactions.slice(
      startIndex,
      endIndex,
    );

    // Transform to TransactionStatement format
    const transformedItems = paginatedTransactions.map((tx: Transaction) => {
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
        itemsPerPage: dto.limit || 10,
        totalPages: Math.ceil(total / (dto.limit || 10)),
        currentPage: dto.page || 1,
      },
      links: {
        first: '',
        previous: '',
        next: '',
        last: '',
      },
    };
  }
}
