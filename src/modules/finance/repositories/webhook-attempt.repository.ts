import { Injectable } from '@nestjs/common';
import { WebhookAttempt } from '../entities/webhook-attempt.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { WebhookProvider } from '../enums/webhook-provider.enum';
import { WebhookStatus } from '../enums/webhook-status.enum';

@Injectable()
export class WebhookAttemptRepository extends BaseRepository<WebhookAttempt> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof WebhookAttempt {
    return WebhookAttempt;
  }

  /**
   * Find webhook attempt by provider and external ID
   */
  async findByProviderAndExternalId(
    provider: WebhookProvider,
    externalId: string,
  ): Promise<WebhookAttempt | null> {
    return this.getRepository().findOne({
      where: { provider, externalId },
    });
  }

  /**
   * Find pending retry attempts
   */
  async findPendingRetries(): Promise<WebhookAttempt[]> {
    return this.getRepository()
      .createQueryBuilder('attempt')
      .where('attempt.status = :status', {
        status: WebhookStatus.RETRY_SCHEDULED,
      })
      .andWhere('attempt.nextRetryAt <= :now', { now: new Date() })
      .getMany();
  }

  /**
   * Update attempt count and schedule next retry
   */
  async scheduleRetry(
    attemptId: string,
    attemptCount: number,
    nextRetryAt: Date,
    errorMessage: string,
  ): Promise<void> {
    await this.getRepository().update(attemptId, {
      attemptCount,
      nextRetryAt,
      status: WebhookStatus.RETRY_SCHEDULED,
      errorMessage,
    });
  }
}
