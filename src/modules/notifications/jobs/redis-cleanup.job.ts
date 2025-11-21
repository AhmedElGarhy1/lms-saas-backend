import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { REDIS_CONSTANTS } from '../constants/notification.constants';
import { NotificationGateway } from '../gateways/notification.gateway';

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
  private readonly staleTTLThreshold: number =
    REDIS_CONSTANTS.STALE_TTL_THRESHOLD_SECONDS;
  private readonly logger: Logger = new Logger(RedisCleanupJob.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly metricsService: NotificationMetricsService,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Validate socket IDs against active Socket.IO server and remove stale ones
   * @param userId - User ID for logging purposes
   * @param socketIds - Array of socket IDs to validate
   * @param key - Redis key for the connection set
   * @returns Object with counts of stale removed, active remaining, and validation time
   */
  private async validateAndCleanupSocketIds(
    userId: string,
    socketIds: string[],
    key: string,
  ): Promise<{
    staleRemoved: number;
    activeRemaining: number;
    validationTimeMs: number;
  }> {
    const startTime = Date.now();
    let staleRemoved = 0;
    let activeRemaining = 0;

    if (!this.notificationGateway?.server) {
      this.logger.warn(
        `Cannot validate sockets - NotificationGateway server not available - userId: ${userId}`,
      );
      return {
        staleRemoved: 0,
        activeRemaining: socketIds.length,
        validationTimeMs: 0,
      };
    }

    const client = this.redisService.getClient();
    const staleSocketIds: string[] = [];

    // Check each socket ID against active Socket.IO server
    for (const socketId of socketIds) {
      const isActive =
        this.notificationGateway.server.sockets.sockets.has(socketId);
      if (isActive) {
        activeRemaining++;
      } else {
        staleSocketIds.push(socketId);
      }
    }

    // Remove stale socket IDs from Redis in batch
    if (staleSocketIds.length > 0) {
      const pipeline = client.pipeline();
      for (const socketId of staleSocketIds) {
        pipeline.srem(key, socketId);
      }
      await pipeline.exec();
      staleRemoved = staleSocketIds.length;

      // If all sockets were stale, delete the key
      if (activeRemaining === 0) {
        await client.del(key);
      }
    }

    const validationTimeMs = Date.now() - startTime;

    return {
      staleRemoved,
      activeRemaining,
      validationTimeMs,
    };
  }

  /**
   * Cleanup stale socket connections every hour
   * Uses SCAN for non-blocking key iteration (efficient for large Redis instances)
   * Checks for socket IDs that no longer have active connections
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStaleConnections(): Promise<void> {
    let client;
    try {
      client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client is not available');
      }
    } catch (error) {
      this.logger.error(
        'Redis connection failed during cleanup job initialization',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }
    const pattern = notificationKeys.connectionPattern();

    const stats = {
      keysScanned: 0,
      keysCleaned: 0,
      emptyKeysRemoved: 0,
      staleKeysRemoved: 0,
      totalConnections: 0,
      warnings: 0,
      staleRemoved: 0,
      validatedCount: 0,
      activeCount: 0,
      aggressiveCleanups: 0,
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
              `Removed stale connection key with low TTL - key: ${key}, ttl: ${ttl}`,
            );
            continue;
          }

          // Validate and cleanup stale socket IDs
          // Always validate users with high connection counts, and periodically validate others
          const shouldValidate =
            socketIds.length >
              REDIS_CONSTANTS.HIGH_CONNECTION_COUNT_THRESHOLD ||
            socketIds.length > 0; // Validate all users to catch stale connections

          if (shouldValidate) {
            const validationResult = await this.validateAndCleanupSocketIds(
              userId,
              socketIds,
              key,
            );

            stats.staleRemoved += validationResult.staleRemoved;
            stats.validatedCount += socketIds.length;
            stats.activeCount += validationResult.activeRemaining;

            if (validationResult.staleRemoved > 0) {
              stats.keysCleaned++;
              this.logger.log(
                `Cleaned up stale socket connections - userId: ${userId}, staleRemoved: ${validationResult.staleRemoved}, activeRemaining: ${validationResult.activeRemaining}, validationTimeMs: ${validationResult.validationTimeMs}`,
              );
            }

            // Proactive cleanup for high-connection-count users
            if (
              socketIds.length > REDIS_CONSTANTS.AGGRESSIVE_CLEANUP_THRESHOLD
            ) {
              stats.aggressiveCleanups++;
              const beforeCount = socketIds.length;
              const afterCount = validationResult.activeRemaining;
              this.logger.warn(
                `Aggressive cleanup performed for high connection count - userId: ${userId}, beforeCount: ${beforeCount}, afterCount: ${afterCount}, staleRemoved: ${validationResult.staleRemoved}, key: ${key}, ttl: ${ttl}`,
              );
            } else if (
              socketIds.length > REDIS_CONSTANTS.HIGH_CONNECTION_COUNT_THRESHOLD
            ) {
              stats.warnings++;
              this.logger.warn(
                `High connection count detected for user - potential leak - userId: ${userId}, connectionCount: ${socketIds.length}, activeCount: ${validationResult.activeRemaining}, staleRemoved: ${validationResult.staleRemoved}, key: ${key}, ttl: ${ttl}`,
              );
            }
          }
        }
      } while (cursor !== '0');

      // Log cleanup results only if cleanup happened or warnings occurred
      if (
        stats.keysCleaned > 0 ||
        stats.warnings > 0 ||
        stats.staleRemoved > 0 ||
        stats.aggressiveCleanups > 0
      ) {
        this.logger.log(
          `Redis cleanup job completed - keysScanned: ${stats.keysScanned}, keysCleaned: ${stats.keysCleaned}, emptyKeysRemoved: ${stats.emptyKeysRemoved}, staleKeysRemoved: ${stats.staleKeysRemoved}, totalConnections: ${stats.totalConnections}, warnings: ${stats.warnings}, staleRemoved: ${stats.staleRemoved}, validatedCount: ${stats.validatedCount}, activeCount: ${stats.activeCount}, aggressiveCleanups: ${stats.aggressiveCleanups}`,
        );
      }

      // Track metrics for monitoring
      if (stats.staleRemoved > 0 || stats.validatedCount > 0) {
        void this.metricsService
          .setActiveConnections(stats.activeCount)
          .catch((error) => {
            this.logger.warn(
              `Failed to update active connections metric - error: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup stale Redis connections - pattern: ${pattern}, keysScanned: ${stats.keysScanned}`,
        error instanceof Error ? error.stack : String(error),
      );
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

      this.logger.log(
        `Manual Redis cleanup completed - cleanedCount: ${cleaned.length}, keysScanned: ${stats.keysScanned}, emptyKeysRemoved: ${stats.emptyKeysRemoved}, staleKeysRemoved: ${stats.staleKeysRemoved}`,
      );

      return {
        cleaned: cleaned.length,
        keys: cleaned,
        stats,
      };
    } catch (error) {
      this.logger.error(
        'Manual Redis cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Periodic full validation of all connection keys
   * Runs every day at 1 AM to validate all socket IDs, not just high-count ones
   * More thorough but less frequent than the hourly cleanup
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async fullValidationCleanup(): Promise<void> {
    let client;
    try {
      client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client is not available');
      }
    } catch (error) {
      this.logger.error(
        'Redis connection failed during full validation cleanup initialization',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    const pattern = notificationKeys.connectionPattern();
    const stats = {
      keysScanned: 0,
      keysValidated: 0,
      staleRemoved: 0,
      activeRemaining: 0,
      totalValidationTimeMs: 0,
    };

    try {
      let cursor = '0';

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

        // Process keys in batches
        const pipeline = client.pipeline();
        const keyToUserId = new Map<string, string>();

        for (const key of keys) {
          const userId = key.split(':').pop() || 'unknown';
          keyToUserId.set(key, userId);
          pipeline.smembers(key);
        }

        const smembersResults = await pipeline.exec();

        // Validate all socket IDs
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const userId = keyToUserId.get(key) || 'unknown';
          const smembersResult = smembersResults?.[i];
          const socketIds =
            smembersResult && smembersResult[1]
              ? (smembersResult[1] as string[])
              : [];

          if (socketIds.length === 0) {
            continue;
          }

          const validationResult = await this.validateAndCleanupSocketIds(
            userId,
            socketIds,
            key,
          );

          stats.keysValidated++;
          stats.staleRemoved += validationResult.staleRemoved;
          stats.activeRemaining += validationResult.activeRemaining;
          stats.totalValidationTimeMs += validationResult.validationTimeMs;
        }
      } while (cursor !== '0');

      // Log results
      if (stats.keysValidated > 0) {
        const avgValidationTime =
          stats.keysValidated > 0
            ? Math.round(stats.totalValidationTimeMs / stats.keysValidated)
            : 0;
        this.logger.log(
          `Full validation cleanup completed - keysScanned: ${stats.keysScanned}, keysValidated: ${stats.keysValidated}, staleRemoved: ${stats.staleRemoved}, activeRemaining: ${stats.activeRemaining}, avgValidationTimeMs: ${avgValidationTime}`,
        );
      }

      // Update metrics
      if (stats.activeRemaining > 0) {
        void this.metricsService
          .setActiveConnections(stats.activeRemaining)
          .catch((error) => {
            this.logger.warn(
              `Failed to update active connections metric after full validation - error: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
      }
    } catch (error) {
      this.logger.error(
        `Failed to perform full validation cleanup - pattern: ${pattern}, keysScanned: ${stats.keysScanned}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
