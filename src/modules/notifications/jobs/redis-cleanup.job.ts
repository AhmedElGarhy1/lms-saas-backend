import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { LoggerService } from '@/shared/services/logger.service';
import { REDIS_CONSTANTS } from '../constants/notification.constants';

/**
 * Periodic job to clean up stale socket connections in Redis.
 *
 * IMPORTANT: This is a secondary cleanup mechanism.
 * Primary cleanup relies on:
 * - Proper handleDisconnect() calls in NotificationGateway
 * - TTL expiration (7 days) on connection keys
 *
 * This job handles edge cases where:
 * - WebSocket connections disconnect ungracefully (server crash, network issues)
 * - Socket IDs remain in Redis but are no longer active
 * - TTL hasn't expired yet but connections are stale
 */
@Injectable()
export class RedisCleanupJob {
  private readonly staleTTLThreshold: number = REDIS_CONSTANTS.STALE_TTL_THRESHOLD_SECONDS;

  constructor(
    private readonly redisService: RedisService,
    private readonly metricsService: NotificationMetricsService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Cleanup stale socket connections every hour
   * Uses SCAN for non-blocking key iteration (efficient for large Redis instances)
   * Checks for socket IDs that no longer have active connections
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStaleConnections(): Promise<void> {
    const client = this.redisService.getClient();
    const pattern = notificationKeys.connectionPattern();

    const stats = {
      keysScanned: 0,
      keysCleaned: 0,
      emptyKeysRemoved: 0,
      staleKeysRemoved: 0,
      totalConnections: 0,
      warnings: 0,
    };

    try {
      let cursor = '0';

      // Use SCAN instead of KEYS for non-blocking iteration
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          REDIS_CONSTANTS.SCAN_BATCH_SIZE,
        );
        cursor = nextCursor;

        if (keys.length === 0) {
          continue;
        }

        stats.keysScanned += keys.length;

        // Process keys in batches using pipeline for efficiency
        const pipeline = client.pipeline();
        const ttlPromises: Promise<number>[] = [];
        const keyToUserId = new Map<string, string>();

        // Prepare batch operations
        for (const key of keys) {
          const userId = key.split(':').pop() || 'unknown';
          keyToUserId.set(key, userId);
          pipeline.smembers(key);
          ttlPromises.push(client.ttl(key));
        }

        // Execute pipeline for SMEMBERS
        const smembersResults = await pipeline.exec();

        // Get TTLs
        const ttls = await Promise.all(ttlPromises);

        // Process results
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const userId = keyToUserId.get(key) || 'unknown';
          const smembersResult = smembersResults?.[i];
          const socketIds =
            smembersResult && smembersResult[1]
              ? (smembersResult[1] as string[])
              : [];
          const ttl = ttls[i];

          stats.totalConnections += socketIds.length;

          // Check for empty sets
          if (socketIds.length === 0) {
            await client.del(key);
            stats.keysCleaned++;
            stats.emptyKeysRemoved++;
            continue;
          }

          // Remove keys with very low TTL (likely stale, close to expiration)
          // This catches connections that should have been cleaned up but weren't
          if (ttl > 0 && ttl < REDIS_CONSTANTS.NEAR_EXPIRATION_TTL_SECONDS) {
            // Less than 1 minute remaining - likely stale
            await client.del(key);
            stats.keysCleaned++;
            stats.staleKeysRemoved++;
            this.logger.warn(
              'Removed stale connection key with low TTL',
              'RedisCleanupJob',
              { key, ttl },
            );
            continue;
          }

          // Log connection stats for monitoring
          if (socketIds.length > REDIS_CONSTANTS.HIGH_CONNECTION_COUNT_THRESHOLD) {
            stats.warnings++;
            this.logger.warn(
              'High connection count detected for user - potential leak',
              'RedisCleanupJob',
              {
                userId,
                connectionCount: socketIds.length,
                key,
                ttl,
              },
            );
          }
        }
      } while (cursor !== '0');

      // Log cleanup results only if cleanup happened or warnings occurred
      if (stats.keysCleaned > 0 || stats.warnings > 0) {
        this.logger.info(
          'Redis cleanup job completed',
          'RedisCleanupJob',
          {
            keysScanned: stats.keysScanned,
            keysCleaned: stats.keysCleaned,
            emptyKeysRemoved: stats.emptyKeysRemoved,
            staleKeysRemoved: stats.staleKeysRemoved,
            totalConnections: stats.totalConnections,
            warnings: stats.warnings,
          },
        );
      }

      // Optional: Track metrics for monitoring (if metrics service supports it)
      // This could be added to NotificationMetricsService if needed
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          'Failed to cleanup stale Redis connections',
          error,
          'RedisCleanupJob',
          {
            pattern,
            keysScanned: stats.keysScanned,
          },
        );
      } else {
        this.logger.error(
          'Failed to cleanup stale Redis connections',
          'RedisCleanupJob',
          {
            pattern,
            keysScanned: stats.keysScanned,
            error: String(error),
          },
        );
      }
    }
  }

  /**
   * Manual cleanup trigger (can be called via admin endpoint if needed)
   * Uses SCAN for non-blocking operation
   */
  async manualCleanup(): Promise<{
    cleaned: number;
    keys: string[];
    stats: {
      keysScanned: number;
      emptyKeysRemoved: number;
      staleKeysRemoved: number;
    };
  }> {
    const client = this.redisService.getClient();
    const pattern = notificationKeys.connectionPattern();
    const cleaned: string[] = [];

    const stats = {
      keysScanned: 0,
      emptyKeysRemoved: 0,
      staleKeysRemoved: 0,
    };

    try {
      let cursor = '0';

      // Use SCAN for non-blocking iteration
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          REDIS_CONSTANTS.SCAN_BATCH_SIZE,
        );
        cursor = nextCursor;

        if (keys.length === 0) {
          continue;
        }

        stats.keysScanned += keys.length;

        // Batch operations using pipeline
        const pipeline = client.pipeline();
        const ttlPromises: Promise<number>[] = [];

        for (const key of keys) {
          pipeline.smembers(key);
          ttlPromises.push(client.ttl(key));
        }

        const smembersResults = await pipeline.exec();
        const ttls = await Promise.all(ttlPromises);

        // Process results
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const smembersResult = smembersResults?.[i];
          const socketIds =
            smembersResult && smembersResult[1]
              ? (smembersResult[1] as string[])
              : [];
          const ttl = ttls[i];

          // Check for empty sets
          if (socketIds.length === 0) {
            await client.del(key);
            cleaned.push(key);
            stats.emptyKeysRemoved++;
            continue;
          }

          // Remove keys with very low TTL
          if (ttl > 0 && ttl < REDIS_CONSTANTS.NEAR_EXPIRATION_TTL_SECONDS) {
            await client.del(key);
            cleaned.push(key);
            stats.staleKeysRemoved++;
          }
        }
      } while (cursor !== '0');

      this.logger.info(
        'Manual Redis cleanup completed',
        'RedisCleanupJob',
        {
          ...stats,
          cleanedCount: cleaned.length,
        },
      );

      return {
        cleaned: cleaned.length,
        keys: cleaned,
        stats,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          'Manual Redis cleanup failed',
          error,
          'RedisCleanupJob',
        );
      } else {
        this.logger.error(
          'Manual Redis cleanup failed',
          'RedisCleanupJob',
          { error: String(error) },
        );
      }
      throw error;
    }
  }
}
