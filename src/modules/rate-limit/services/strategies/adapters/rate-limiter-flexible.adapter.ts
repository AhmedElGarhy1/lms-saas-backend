import { Injectable } from '@nestjs/common';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { BaseRateLimitStrategy } from '../base-rate-limit-strategy';
import {
  IRateLimitStrategy,
  RateLimitCheckOptions,
} from '../../../interfaces/rate-limit-strategy.interface';
import { RateLimitResult } from '../../../interfaces/rate-limit-result.interface';
import { RateLimitConfig } from '../../../interfaces/rate-limit-config.interface';
import { RateLimitKeyBuilder } from '../../../utils/rate-limit-key-builder';

/**
 * Adapter for rate-limiter-flexible package
 * Wraps RateLimiterRedis to provide unified interface
 */
@Injectable()
export class RateLimiterFlexibleAdapter
  extends BaseRateLimitStrategy
  implements IRateLimitStrategy
{
  private limiter: RateLimiterRedis;

  constructor(
    config: RateLimitConfig,
    private readonly redisService: RedisService,
  ) {
    super(config);
    this.initializeLimiter();
  }

  getStrategyName(): string {
    return 'RATE_LIMITER_FLEXIBLE';
  }

  private initializeLimiter(): void {
    const redisClient = this.redisService.getClient();

    // Build key prefix
    const keyPrefix = this.config.keyPrefix
      ? `${this.config.keyPrefix}:rate-limit-flexible`
      : 'rate-limit-flexible';

    this.limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix,
      points: this.config.limit,
      duration: this.config.windowSeconds,
    });
  }

  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    options?: RateLimitCheckOptions,
  ): Promise<RateLimitResult> {
    // Build full key with context if provided
    const fullKey = RateLimitKeyBuilder.buildKey(
      undefined, // Prefix is handled by limiter
      options?.context,
      key,
    );

    const consumePoints =
      options?.consumePoints || this.config.consumePoints || 1;

    try {
      // If dry run, get current state without consuming
      if (options?.dryRun === true) {
        const res = await this.limiter.get(fullKey);
        if (!res) {
          return {
            allowed: true,
            remaining: limit,
            limit,
            resetTime: Date.now() + windowSeconds * 1000,
          };
        }

        const remaining = res.remainingPoints;
        const isAllowed = remaining >= consumePoints;

        return {
          allowed: isAllowed,
          remaining: Math.max(0, remaining),
          limit,
          resetTime: Date.now() + res.msBeforeNext,
          retryAfter: isAllowed ? undefined : res.msBeforeNext,
        };
      }

      // Consume points
      const res = await this.limiter.consume(fullKey, consumePoints);

      return {
        allowed: true,
        remaining: res.remainingPoints,
        limit,
        resetTime: Date.now() + res.msBeforeNext,
        retryAfter: res.msBeforeNext,
      };
    } catch (e) {
      if (e instanceof RateLimiterRes) {
        // Rate limit exceeded
        this.emitMetric('block', key, {
          remaining: e.remainingPoints,
          limit,
        });

        return {
          allowed: false,
          remaining: e.remainingPoints,
          limit,
          retryAfter: e.msBeforeNext,
          resetTime: Date.now() + e.msBeforeNext,
        };
      }

      // Redis or other errors
      return this.handleError(
        e instanceof Error ? e : new Error(String(e)),
        key,
        limit,
        windowSeconds,
      );
    }
  }

  async getCurrentCount(key: string, windowSeconds: number): Promise<number> {
    const fullKey = RateLimitKeyBuilder.buildKey(undefined, undefined, key);

    try {
      const res = await this.limiter.get(fullKey);
      if (!res) {
        return 0;
      }

      // Calculate count from remaining points
      return this.config.limit - res.remainingPoints;
    } catch (error) {
      this.logger.error(
        `Failed to get current count for key ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  async reset(key: string): Promise<void> {
    const fullKey = RateLimitKeyBuilder.buildKey(undefined, undefined, key);

    try {
      await this.limiter.delete(fullKey);
    } catch (error) {
      this.logger.error(
        `Failed to reset rate limit for key ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
