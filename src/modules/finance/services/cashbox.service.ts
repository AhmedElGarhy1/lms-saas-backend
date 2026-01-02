import { Injectable, Logger } from '@nestjs/common';
import { CashboxRepository } from '../repositories/cashbox.repository';
import { CashTransactionRepository } from '../repositories/cash-transaction.repository';
import {
  TransactionRepository,
  TransactionStatement,
} from '../repositories/transaction.repository';
import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { Cashbox } from '../entities/cashbox.entity';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import { Transactional } from '@nestjs-cls/transactional';
import { QueryFailedError } from 'typeorm';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import {
  CenterTreasuryStatsDto,
  CenterStatementItemDto,
  CenterCashStatementItemDto,
} from '../dto/center-revenue-stats.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { PaginateTransactionDto } from '../dto/paginate-transaction.dto';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';

const MAX_RETRIES = 3;

@Injectable()
export class CashboxService extends BaseService {
  private readonly logger = new Logger(CashboxService.name);

  constructor(
    private readonly cashboxRepository: CashboxRepository,
    private readonly cashTransactionRepository: CashTransactionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {
    super();
  }

  /**
   * Get or create cashbox for branch
   */
  @Transactional()
  async getCashbox(branchId: string): Promise<Cashbox> {
    let cashbox = await this.cashboxRepository.findByBranchId(branchId);

    if (!cashbox) {
      cashbox = await this.cashboxRepository.create({
        branchId,
        balance: Money.zero(),
      });
    }

    return cashbox;
  }

  /**
   * Update cashbox balance with pessimistic locking and retry mechanism
   */
  @Transactional()
  async updateBalance(
    cashboxId: string,
    amount: Money,
    retryCount = 0,
  ): Promise<Cashbox> {
    try {
      // Acquire pessimistic write lock on cashbox row
      const cashbox = await this.cashboxRepository.findOneWithLock(cashboxId);

      // Pre-check: Prevent negative balance (before save to avoid DB constraint violation)
      const newBalance = cashbox.balance.add(amount);
      if (newBalance.isNegative()) {
        throw FinanceErrors.insufficientFunds(
          cashbox.balance.toNumber(),
          amount.toNumber(),
          'EGP'
        );
      }

      // Perform balance update using Money utility
      cashbox.balance = newBalance;

      // Save within transaction (automatically committed by @Transactional)
      return await this.cashboxRepository.saveCashbox(cashbox);
    } catch (error) {
      // Retry on lock timeout (PostgreSQL error code 40001 or 40P01)
      if (
        error instanceof QueryFailedError &&
        (error.driverError?.code === '40001' ||
          error.driverError?.code === '40P01') &&
        retryCount < MAX_RETRIES
      ) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retryCount)),
        );
        this.logger.warn(
          `Lock timeout on cashbox ${cashboxId}, retrying (${retryCount + 1}/${MAX_RETRIES})`,
        );
        return this.updateBalance(cashboxId, amount, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Paginate cashboxes with optional filtering
   */
  async paginateCashboxes(paginationDto: any, actor: ActorUser): Promise<any> {
    // TODO: Implement proper pagination with filtering
    // For now, return mock pagination result
    const mockResult = {
      data: [],
      meta: {
        page: paginationDto.page || 1,
        limit: paginationDto.limit || 10,
        totalItems: 0,
        totalPages: 0,
      },
    };

    return mockResult;
  }

  /**
   * Get center treasury statistics including cashbox and wallet balances across all branches
   */
  async getCenterTreasuryStats(
    centerId: string,
  ): Promise<CenterTreasuryStatsDto> {
    return this.cashboxRepository.getCenterTreasuryStats(centerId);
  }

  /**
   * Get center wallet statement - all wallet transactions across branches in center
   */
  async getCenterStatement(
    centerId: string,
    paginationDto: PaginateTransactionDto,
    branchId?: string,
  ): Promise<Pagination<CenterStatementItemDto>> {
    return this.cashboxRepository.getCenterStatement(
      centerId,
      paginationDto,
      branchId,
    );
  }

  /**
   * Get center cash statement - all cash transactions across branches in center
   */
  async getCenterCashStatement(
    centerId: string,
    paginationDto: PaginateTransactionDto,
    branchId?: string,
  ): Promise<Pagination<CenterCashStatementItemDto>> {
    return this.cashboxRepository.getCenterCashStatement(
      centerId,
      paginationDto,
      branchId,
    );
  }
}
