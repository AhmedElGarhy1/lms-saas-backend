import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationConfig } from '../config/notification.config';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';

/**
 * Periodic job to clean up old failed notification logs from DLQ
 * Prevents database bloat by removing entries older than retention period
 *
 * Runs daily at 2 AM to minimize impact on production traffic
 */
@Injectable()
export class NotificationDlqCleanupJob {
  private readonly retentionDays: number;
  private readonly logger: Logger = new Logger(NotificationDlqCleanupJob.name);

  constructor(
    private readonly logRepository: NotificationLogRepository,
    private readonly redisService: RedisService,
  ) {
    this.retentionDays = NotificationConfig.dlq.retentionDays;
  }

  /**
   * Cleanup old failed notification logs daily at 2 AM
   * Uses bulkDelete for efficient batch deletion
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldFailedJobs(): Promise<void> {
    const startTime = Date.now();

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
        return;
      }

      // Delete entries older than cutoff date using repository method
      const deletedCount =
        await this.logRepository.deleteOldFailedLogs(cutoffDate);

      // Persist cleanup run timestamp
      await this.persistCleanupRun();

      const duration = Date.now() - startTime;

      this.logger.log('DLQ cleanup completed', {
        deletedCount,
        retentionDays: this.retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        oldestEntryDate: oldestEntry?.toISOString(),
        totalFailed: totalFailed.length,
        duration,
      });

      // Log warning if cleanup took too long
      if (duration > 60000) {
        // More than 1 minute
        this.logger.warn(
          `DLQ cleanup took too long - consider optimizing or running during lower traffic periods - duration: ${duration}, deletedCount: ${deletedCount}, durationSeconds: ${Math.round(duration / 1000)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `DLQ cleanup job failed - retentionDays: ${this.retentionDays}, duration: ${Date.now() - startTime}`,
        error instanceof Error ? error.stack : String(error),
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

  /**
   * Get DLQ health status
   */
  async getDlqHealthStatus(): Promise<{
    totalFailed: number;
    oldestFailedDate: Date | null;
    entriesToBeDeleted: number;
    lastCleanupRun: Date | null;
    isHealthy: boolean;
  }> {
    const stats = await this.getRetentionStats();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    // Get last cleanup run timestamp from Redis
    const lastCleanupRun = await this.getLastCleanupRun();

    // Check if DLQ is growing too large (warning threshold)
    const isHealthy = stats.totalFailed < 10000; // Configurable threshold

    // Check if cleanup job is stalling (should run daily)
    const hoursSinceLastRun = lastCleanupRun
      ? (Date.now() - lastCleanupRun.getTime()) / (1000 * 60 * 60)
      : Infinity;
    const isStalling = hoursSinceLastRun > 25; // More than 25 hours = stalling

    return {
      ...stats,
      lastCleanupRun,
      isHealthy: isHealthy && !isStalling,
    };
  }

  /**
   * Get last cleanup run timestamp from Redis
   */
  private async getLastCleanupRun(): Promise<Date | null> {
    try {
      const client = this.redisService.getClient();
      const key = notificationKeys.dlqLastCleanup();
      const timestamp = await client.get(key);

      if (timestamp) {
        return new Date(parseInt(timestamp, 10));
      }
      return null;
    } catch {
      // Non-critical - doesn't affect functionality
      return null;
    }
  }

  /**
   * Persist cleanup run timestamp to Redis
   */
  private async persistCleanupRun(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const key = notificationKeys.dlqLastCleanup();
      await client.set(key, Date.now().toString(), 'EX', 7 * 24 * 60 * 60); // 7 days TTL
    } catch {
      // Non-critical - doesn't affect functionality
    }
  }
}
