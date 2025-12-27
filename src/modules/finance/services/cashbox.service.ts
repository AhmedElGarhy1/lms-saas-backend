import { Injectable, Logger } from '@nestjs/common';
import { CashboxRepository } from '../repositories/cashbox.repository';
import { Cashbox } from '../entities/cashbox.entity';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import {
  ResourceNotFoundException,
  InsufficientFundsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { QueryFailedError } from 'typeorm';

const MAX_RETRIES = 3;

@Injectable()
export class CashboxService extends BaseService {
  private readonly logger = new Logger(CashboxService.name);

  constructor(private readonly cashboxRepository: CashboxRepository) {
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
}

