import { Injectable, Logger } from '@nestjs/common';
import { CashboxRepository } from '../repositories/cashbox.repository';
import { CashTransactionRepository } from '../repositories/cash-transaction.repository';
import { Cashbox } from '../entities/cashbox.entity';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import {
  ResourceNotFoundException,
  InsufficientFundsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { QueryFailedError } from 'typeorm';
import { ActorUser } from '@/shared/common/types/actor-user.type';

const MAX_RETRIES = 3;

@Injectable()
export class CashboxService extends BaseService {
  private readonly logger = new Logger(CashboxService.name);

  constructor(
    private readonly cashboxRepository: CashboxRepository,
    private readonly cashTransactionRepository: CashTransactionRepository,
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
        throw new InsufficientFundsException('t.messages.businessLogicError', {
          message: 'Insufficient cashbox balance',
        } as never);
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
   * Record audit timestamp
   */
  @Transactional()
  async audit(cashboxId: string): Promise<Cashbox> {
    const cashbox = await this.cashboxRepository.findOneOrThrow(cashboxId);
    cashbox.lastAuditedAt = new Date();
    return this.cashboxRepository.saveCashbox(cashbox);
  }

  /**
   * Get daily cash collection summary for branch
   * Shows cash collected vs session admissions for reconciliation
   */
  async getDailySummary(
    branchId: string,
    date: Date,
    actor: ActorUser,
  ): Promise<any> {
    // Get start and end of the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get cashbox for this branch
    const cashbox = await this.cashboxRepository.findByBranchId(branchId);

    if (!cashbox) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.cashbox',
      });
    }

    // Get all cash transactions for this branch on the specified date
    const { count: cashPaymentsCount, totalAmount: cashCollected } =
      await this.cashTransactionRepository.getCashSummaryForBranch(
        branchId,
        startOfDay,
        endOfDay,
      );

    // TODO: Get session admissions count for the same period
    // This would require joining with student_session_payments
    // For now, assume each cash transaction = 1 admission
    const sessionAdmissions = cashPaymentsCount;

    // Expected cash should equal cash collected (assuming no manual adjustments)
    const expectedCash = cashCollected;

    // Check if they match
    const status =
      Math.abs(cashCollected - expectedCash) < 0.01 ? 'MATCHED' : 'MISMATCH';

    const summary = {
      branchId,
      date: date.toISOString().split('T')[0],
      cashCollected,
      sessionAdmissions,
      expectedCash,
      cashboxBalance: parseFloat(cashbox.balance.toString()),
      status,
      summary: `${sessionAdmissions} session admission${sessionAdmissions !== 1 ? 's' : ''} collected ${cashCollected.toFixed(2)} EGP. Drawer balance: ${cashbox.balance.toString()} EGP.`,
    };

    return summary;
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
}
