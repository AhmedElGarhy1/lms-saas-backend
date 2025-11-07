import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { NotificationStatus } from '../enums/notification-status.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { Config } from '@/shared/config/config';

/**
 * Periodic job to clean up old failed notification logs from DLQ
 * Prevents database bloat by removing entries older than retention period
 *
 * Runs daily at 2 AM to minimize impact on production traffic
 */
@Injectable()
export class NotificationDlqCleanupJob {
  private readonly logger = new Logger(NotificationDlqCleanupJob.name);
  private readonly retentionDays: number;

  constructor(
    private readonly logRepository: NotificationLogRepository,
    private readonly loggerService: LoggerService,
  ) {
    this.retentionDays = Config.notification.dlq.retentionDays;
  }

  /**
   * Cleanup old failed notification logs daily at 2 AM
   * Uses bulkDelete for efficient batch deletion
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldFailedJobs(): Promise<void> {
    const startTime = Date.now();
    this.logger.log(
      `Starting DLQ cleanup job (retention: ${this.retentionDays} days)`,
      'NotificationDlqCleanupJob',
    );

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      // Get count of entries to be deleted (for logging)
      // Use repository methods instead of accessing protected getRepository()
      const totalFailed = await this.logRepository.findMany({
        where: {
          status: NotificationStatus.FAILED,
        },
      });

      const oldEntries = totalFailed.filter(
        (log) => log.createdAt < cutoffDate,
      );
      const countToDelete = oldEntries.length;
      const oldestEntry =
        oldEntries.length > 0 ? oldEntries[0].createdAt : null;

      if (countToDelete === 0) {
        this.logger.log(
          'No old failed notifications to clean up',
          'NotificationDlqCleanupJob',
          {
            retentionDays: this.retentionDays,
            cutoffDate: cutoffDate.toISOString(),
            totalFailed: totalFailed.length,
          },
        );
        return;
      }

      // Delete entries older than cutoff date using repository method
      const deletedCount =
        await this.logRepository.deleteOldFailedLogs(cutoffDate);

      const duration = Date.now() - startTime;

      this.logger.log(
        `DLQ cleanup completed: ${deletedCount} entries deleted`,
        'NotificationDlqCleanupJob',
        {
          deletedCount,
          retentionDays: this.retentionDays,
          cutoffDate: cutoffDate.toISOString(),
          oldestEntryDate: oldestEntry?.toISOString(),
          totalFailed: totalFailed.length,
          duration: `${duration}ms`,
        },
      );

      // Log warning if cleanup took too long
      if (duration > 60000) {
        // More than 1 minute
        this.logger.warn(
          `DLQ cleanup took ${duration}ms (${Math.round(duration / 1000)}s) - consider optimizing or running during lower traffic periods`,
          'NotificationDlqCleanupJob',
          {
            duration,
            deletedCount,
          },
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `DLQ cleanup job failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationDlqCleanupJob',
        {
          retentionDays: this.retentionDays,
          duration: `${Date.now() - startTime}ms`,
        },
      );
    }
  }

  /**
   * Get retention statistics (for monitoring/debugging)
   */
  async getRetentionStats(): Promise<{
    retentionDays: number;
    totalFailed: number;
    oldestFailedDate: Date | null;
    entriesToBeDeleted: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const allFailed = await this.logRepository.findMany({
      where: {
        status: NotificationStatus.FAILED,
      },
      order: { createdAt: 'ASC' },
    });

    const oldEntries = allFailed.filter((log) => log.createdAt < cutoffDate);
    const oldest = allFailed.length > 0 ? allFailed[0].createdAt : null;

    return {
      retentionDays: this.retentionDays,
      totalFailed: allFailed.length,
      oldestFailedDate: oldest,
      entriesToBeDeleted: oldEntries.length,
    };
  }
}
