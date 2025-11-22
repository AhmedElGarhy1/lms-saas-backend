import { Injectable } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { BaseRateLimitStrategy } from './base-rate-limit-strategy';
import {
  IRateLimitStrategy,
  RateLimitCheckOptions,
} from '../../interfaces/rate-limit-strategy.interface';
import { RateLimitResult } from '../../interfaces/rate-limit-result.interface';
import { RateLimitConfig } from '../../interfaces/rate-limit-config.interface';
import { RateLimitKeyBuilder } from '../../utils/rate-limit-key-builder';

/**
 * Sliding window rate limiter using Redis sorted sets
 * Provides smoother rate limiting compared to fixed window counters
 */
@Injectable()
export class SlidingWindowStrategy
  extends BaseRateLimitStrategy
  implements IRateLimitStrategy
{
  constructor(
    config: RateLimitConfig,
    private readonly redisService: RedisService,
  ) {
    super(config);
  }

  getStrategyName(): string {
    return 'SLIDING_WINDOW';
  }

  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    options?: RateLimitCheckOptions,
  ): Promise<RateLimitResult> {
    const redisKey = RateLimitKeyBuilder.buildKey(
      this.config.keyPrefix,
      options?.context,
      key,
    );

    const client = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const consumePoints =
      options?.consumePoints || this.config.consumePoints || 1;

    try {
      // Use Lua script for atomic operations
      // This ensures remove-old-entries + add-new-entry + count are atomic
      const script = `
        local key = KEYS[1]
        local windowStart = tonumber(ARGV[1])
        local now = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local windowSeconds = tonumber(ARGV[4])
        local consumePoints = tonumber(ARGV[5])
        local dryRun = ARGV[6] == 'true'
        
        -- Remove old entries outside the sliding window
        redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
        
        -- Count current requests in the window
        local count = redis.call('ZCARD', key)
        
        -- Check if adding consumePoints would exceed limit
        if count + consumePoints <= limit then
          if not dryRun then
            -- Add current request(s) with timestamp as score and value
            for i = 1, consumePoints do
              redis.call('ZADD', key, now + i, now + i)
            end
            -- Set TTL to windowSeconds + 1 to prevent key leakage
            redis.call('EXPIRE', key, windowSeconds + 1)
          end
          -- Return: allowed, new count, reset time
          return {1, count + consumePoints, now + windowSeconds * 1000}
        else
          -- Rate limit exceeded
          -- Get oldest entry to calculate retry-after
          local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
          local retryAfter = 0
          local actualResetTime = now + windowSeconds * 1000  -- Fallback
          if #oldest > 0 then
            local oldestTime = tonumber(oldest[2])
            actualResetTime = oldestTime + windowSeconds * 1000
            retryAfter = actualResetTime - now
            if retryAfter < 0 then
              retryAfter = 0
            end
          end
          return {0, count, actualResetTime, retryAfter}
        end
      `;

      const result = (await client.eval(
        script,
        1,
        redisKey,
        windowStart.toString(),
        now.toString(),
        limit.toString(),
        windowSeconds.toString(),
        consumePoints.toString(),
        (options?.dryRun === true).toString(),
      )) as [number, number, number, number?];

      const [allowed, count, resetTime, retryAfter] = result;
      const isAllowed = allowed === 1;

      // Emit metrics
      if (isAllowed) {
        this.emitMetric('hit', key, { count, limit });
      } else {
        this.emitMetric('block', key, { count, limit });
      }

      return {
        allowed: isAllowed,
        remaining: Math.max(0, limit - count),
        limit,
        resetTime,
        retryAfter,
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
    const redisKey = RateLimitKeyBuilder.buildKey(
      this.config.keyPrefix,
      undefined,
      key,
    );

    const client = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Remove old entries and count
      await client.zremrangebyscore(redisKey, '-inf', windowStart);
      const count = await client.zcard(redisKey);
      return count;
    } catch (error) {
      this.logger.error(
        `Failed to get current count for key ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  async reset(key: string): Promise<void> {
    const redisKey = RateLimitKeyBuilder.buildKey(
      this.config.keyPrefix,
      undefined,
      key,
    );

    const client = this.redisService.getClient();
    try {
      await client.del(redisKey);
    } catch (error) {
      this.logger.error(
        `Failed to reset rate limit for key ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
