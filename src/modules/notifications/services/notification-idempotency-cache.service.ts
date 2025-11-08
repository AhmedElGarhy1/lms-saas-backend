import { Injectable } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { STRING_CONSTANTS } from '../constants/notification.constants';
import { NotificationConfig } from '../config/notification.config';
import { Config } from '@/shared/config/config';

/**
 * Service for managing idempotency cache using Redis
 * Prevents duplicate notifications by caching successful sends with short TTL
 * Reduces database load from idempotency checks
 *
 * Error Handling Strategy: FAIL_OPEN
 * - If idempotency check fails (e.g., Redis unavailable), notifications are allowed
 * - Prevents duplicate prevention from blocking all notifications
 * - Idempotency is best-effort, not critical for system operation
 * - Errors are logged but do not block notification processing
 *
 * @see ERROR_HANDLING_CONFIG.IDEMPOTENCY
 */
@Injectable()
export class NotificationIdempotencyCacheService {
  private readonly redisKeyPrefix: string;
  private readonly defaultTtlSeconds: number;
  private readonly lockTtlSeconds: number;
  private readonly lockTimeoutMs: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.redisKeyPrefix = Config.redis.keyPrefix;
    this.defaultTtlSeconds = NotificationConfig.idempotency.cacheTtlSeconds;
    this.lockTtlSeconds = NotificationConfig.idempotency.lockTtlSeconds;
    this.lockTimeoutMs = NotificationConfig.idempotency.lockTimeoutMs;
  }

  /**
   * Build cache key for idempotency check
   */
  private buildKey(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): string {
    // Hash recipient if it's too long to avoid key length issues
    const recipientHash =
      recipient.length > STRING_CONSTANTS.MAX_RECIPIENT_HASH_LENGTH
        ? Buffer.from(recipient).toString('base64').slice(0, STRING_CONSTANTS.MAX_RECIPIENT_HASH_LENGTH)
        : recipient;

    return `${this.redisKeyPrefix}:notification:idempotency:${correlationId}:${type}:${channel}:${recipientHash}`;
  }

  /**
   * Build lock key for distributed locking
   */
  private buildLockKey(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): string {
    const recipientHash =
      recipient.length > STRING_CONSTANTS.MAX_RECIPIENT_HASH_LENGTH
        ? Buffer.from(recipient).toString('base64').slice(0, STRING_CONSTANTS.MAX_RECIPIENT_HASH_LENGTH)
        : recipient;

    return `${this.redisKeyPrefix}:notification:lock:${correlationId}:${type}:${channel}:${recipientHash}`;
  }

  /**
   * Acquire distributed lock to prevent race conditions
   * Returns true if lock acquired, false if already locked or timeout
   */
  async acquireLock(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): Promise<boolean> {
    const lockKey = this.buildLockKey(correlationId, type, channel, recipient);
    const client = this.redisService.getClient();

    try {
      // Use SET with NX (only if not exists) and EX (expire) for atomic lock acquisition
      // Returns 'OK' if lock acquired, null if already locked
      const result = await Promise.race([
        client.set(
          lockKey,
          Date.now().toString(),
          'EX',
          this.lockTtlSeconds,
          'NX',
        ),
        new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), this.lockTimeoutMs),
        ),
      ]);

      if (result === 'OK') {
        return true; // Lock acquired
      }

      // Lock already exists or timeout
      this.logger.debug(
        `Could not acquire lock for ${correlationId}:${type}:${channel} (already locked or timeout)`,
        'NotificationIdempotencyCacheService',
        {
          correlationId,
          type,
          channel,
          recipient: recipient.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH),
        },
      );
      return false;
    } catch (error) {
      // On Redis error, fail open (allow notification to proceed)
      // This ensures system continues to work even if Redis is down
      this.logger.error(
        `Lock acquisition failed for ${correlationId}:${type}:${channel}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationIdempotencyCacheService',
        {
          correlationId,
          type,
          channel,
          recipient: recipient.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH),
        },
      );
      return false; // Fail open - allow notification
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): Promise<void> {
    const lockKey = this.buildLockKey(correlationId, type, channel, recipient);
    const client = this.redisService.getClient();

    try {
      await client.del(lockKey);
    } catch (error) {
      // Log error but don't throw - lock will expire automatically
      this.logger.warn(
        `Failed to release lock: ${correlationId}:${type}:${channel}`,
        'NotificationIdempotencyCacheService',
        {
          correlationId,
          type,
          channel,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Check if notification was already sent and set if not
   * Returns true if already sent (should skip), false if new (should send)
   */
  async checkAndSet(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): Promise<boolean> {
    const key = this.buildKey(correlationId, type, channel, recipient);
    const client = this.redisService.getClient();

    try {
      // Use SET with NX (only if not exists) and EX (expire) for atomic operation
      // Returns 1 if key was set (new), 0 if key already exists (duplicate)
      const result = await client.set(
        key,
        Date.now().toString(), // Store timestamp for debugging
        'EX',
        this.defaultTtlSeconds,
        'NX', // Only set if not exists
      );

      // If result is 'OK', it means key was set (new notification)
      // If result is null, key already exists (duplicate)
      return result === null;
    } catch (error) {
      // On Redis error, fail open (allow notification to proceed)
      // This ensures system continues to work even if Redis is down
      this.logger.error(
        `Idempotency cache check failed for ${correlationId}:${type}:${channel}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationIdempotencyCacheService',
        {
          correlationId,
          type,
          channel,
          recipient: recipient.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH), // Log first 20 chars for debugging
        },
      );
      return false; // Fail open - allow notification
    }
  }

  /**
   * Mark notification as sent (called after successful send)
   */
  async markSent(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): Promise<void> {
    const key = this.buildKey(correlationId, type, channel, recipient);
    const client = this.redisService.getClient();

    try {
      // Set key with TTL if not already set (for cases where checkAndSet wasn't called)
      await client.set(
        key,
        Date.now().toString(),
        'EX',
        this.defaultTtlSeconds,
      );
    } catch (error) {
      // Log error but don't throw - marking as sent is best-effort
      this.logger.warn(
        `Failed to mark notification as sent in cache: ${correlationId}:${type}:${channel}`,
        'NotificationIdempotencyCacheService',
        {
          correlationId,
          type,
          channel,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Clear idempotency cache entry (for manual invalidation if needed)
   */
  async clear(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): Promise<void> {
    const key = this.buildKey(correlationId, type, channel, recipient);
    const client = this.redisService.getClient();

    try {
      await client.del(key);
    } catch (error) {
      this.logger.warn(
        `Failed to clear idempotency cache: ${correlationId}:${type}:${channel}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationIdempotencyCacheService',
      );
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  async getStats(): Promise<{
    keyCount: number;
    ttlSeconds: number;
  }> {
    try {
      const client = this.redisService.getClient();
      const pattern = `${this.redisKeyPrefix}:notification:idempotency:*`;

      // Count keys matching pattern (note: SCAN is more efficient for large datasets)
      let count = 0;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        count += keys.length;
      } while (cursor !== '0');

      return {
        keyCount: count,
        ttlSeconds: this.defaultTtlSeconds,
      };
    } catch (error) {
      this.logger.warn(
        'Failed to get idempotency cache stats',
        error instanceof Error ? error.stack : undefined,
        'NotificationIdempotencyCacheService',
      );
      return {
        keyCount: 0,
        ttlSeconds: this.defaultTtlSeconds,
      };
    }
  }
}
