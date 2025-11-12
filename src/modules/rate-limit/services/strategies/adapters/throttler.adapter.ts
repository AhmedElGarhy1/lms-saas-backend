import { Injectable, Optional } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { BaseRateLimitStrategy } from '../base-rate-limit-strategy';
import {
  IRateLimitStrategy,
  RateLimitCheckOptions,
} from '../../../interfaces/rate-limit-strategy.interface';
import { RateLimitResult } from '../../../interfaces/rate-limit-result.interface';
import { RateLimitConfig } from '../../../interfaces/rate-limit-config.interface';
import { RateLimitKeyBuilder } from '../../../utils/rate-limit-key-builder';

/**
 * Adapter for @nestjs/throttler package
 * Wraps ThrottlerStorage to provide unified interface
 * For backward compatibility during migration
 */
@Injectable()
export class ThrottlerAdapter
  extends BaseRateLimitStrategy
  implements IRateLimitStrategy
{
  constructor(
    config: RateLimitConfig,
    @Optional() private readonly throttlerStorage?: ThrottlerStorage,
  ) {
    super(config);

    if (!throttlerStorage) {
      this.logger.warn(
        'ThrottlerStorage not provided. ThrottlerAdapter will not function correctly.',
      );
    }
  }

  getStrategyName(): string {
    return 'THROTTLER';
  }

  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    options?: RateLimitCheckOptions,
  ): Promise<RateLimitResult> {
    if (!this.throttlerStorage) {
      return this.handleError(
        new Error('ThrottlerStorage not available'),
        key,
        limit,
        windowSeconds,
      );
    }

    const redisKey = RateLimitKeyBuilder.buildKey(
      this.config.keyPrefix,
      options?.context,
      key,
    );

    const ttl = windowSeconds * 1000; // Convert to milliseconds
    const now = Date.now();
    const consumePoints =
      options?.consumePoints || this.config.consumePoints || 1;
    const blockDuration = 0; // No blocking, just rate limiting
    const throttlerName = 'default';

    try {
      // ThrottlerStorage uses increment method which returns the current state
      // If dry run, we can't use increment, so we'll need to handle it differently
      if (options?.dryRun === true) {
        // For dry run, we can't check without incrementing
        // Return a conservative estimate (assume allowed)
        return {
          allowed: true,
          remaining: limit,
          limit,
          resetTime: now + ttl,
        };
      }

      // Call increment for each point consumed
      let record;
      for (let i = 0; i < consumePoints; i++) {
        record = await this.throttlerStorage.increment(
          redisKey,
          ttl,
          limit,
          blockDuration,
          throttlerName,
        );
      }

      // Ensure record is defined (should always be after loop)
      if (!record) {
        return this.handleError(
          new Error('Failed to get record from ThrottlerStorage'),
          key,
          limit,
          windowSeconds,
        );
      }

      // Check if within limit
      const isAllowed = record.totalHits <= limit;

      if (isAllowed) {
        this.emitMetric('hit', key, { count: record.totalHits, limit });

        return {
          allowed: true,
          remaining: Math.max(0, limit - record.totalHits),
          limit,
          resetTime: now + record.timeToExpire,
        };
      }

      // Rate limit exceeded
      this.emitMetric('block', key, { count: record.totalHits, limit });

      return {
        allowed: false,
        remaining: 0,
        limit,
        resetTime: now + record.timeToExpire,
        retryAfter: record.timeToExpire,
      };
    } catch (error) {
      return this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        key,
        limit,
        windowSeconds,
      );
    }
  }

  async getCurrentCount(key: string, windowSeconds: number): Promise<number> {
    if (!this.throttlerStorage) {
      return 0;
    }

    // ThrottlerStorage doesn't have a getRecord method
    // We can't get the count without incrementing
    // For now, return 0 as we can't reliably get the count
    // In a real implementation, you might need to use Redis directly or cache the count
    this.logger.warn(
      `getCurrentCount not fully supported for ThrottlerAdapter - key: ${key}, windowSeconds: ${windowSeconds} - returning 0`,
    );
    return Promise.resolve(0);
  }

  reset(key: string): Promise<void> {
    if (!this.throttlerStorage) {
      throw new Error('ThrottlerStorage not available');
    }

    const redisKey = RateLimitKeyBuilder.buildKey(
      this.config.keyPrefix,
      undefined,
      key,
    );

    // ThrottlerStorage doesn't have a direct delete/reset method
    // The storage implementation would need to handle this
    // For now, log a warning that reset is not fully supported
    this.logger.warn(
      `reset not fully supported for ThrottlerAdapter - key: ${redisKey}`,
    );
    // In a real implementation, you might need to access the underlying storage
    // (e.g., Redis) directly to delete the key
    return Promise.resolve();
  }
}
