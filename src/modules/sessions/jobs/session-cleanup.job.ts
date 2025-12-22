import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionsRepository } from '../repositories/sessions.repository';

/**
 * Nightly cronjob to clean up SCHEDULED sessions for hard-locked classes
 * Hard-locked classes are those in CANCELED or FINISHED status for more than 24 hours
 * This cleanup runs after the grace period expires, allowing classes to be reverted within 24 hours
 */
@Injectable()
export class SessionCleanupJob {
  private readonly logger = new Logger(SessionCleanupJob.name);

  constructor(private readonly sessionsRepository: SessionsRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    this.logger.log('Starting session cleanup job for hard-locked classes');

    try {
      const deletedCount =
        await this.sessionsRepository.deleteScheduledSessionsForHardLockedClasses();

      this.logger.log(
        `Session cleanup completed. Deleted ${deletedCount} SCHEDULED sessions for hard-locked classes`,
      );
    } catch (error) {
      this.logger.error(
        `Session cleanup job failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

