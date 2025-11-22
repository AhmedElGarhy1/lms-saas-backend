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
 * Fixed window rate limiter using Redis INCR
 * Simpler and faster than sliding window, suitable for HTTP endpoints
 */
@Injectable()
export class FixedWindowStrategy
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
    return 'FIXED_WINDOW';
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
    const consumePoints =
      options?.consumePoints || this.config.consumePoints || 1;

    try {
      // Use Lua script for atomic INCR + EXPIRE
      // This ensures the counter increment and TTL setting are atomic
      const script = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local windowSeconds = tonumber(ARGV[2])
        local consumePoints = tonumber(ARGV[3])
        local dryRun = ARGV[4] == 'true'
        
        -- Increment counter
        local count = redis.call('INCR', key)
        
        -- Get TTL to check if key needs expiration AND to calculate reset time
        local ttl = redis.call('TTL', key)
        
        -- Set TTL only if key is new (count == 1) or doesn't have TTL
        if count == consumePoints or ttl == -1 then
          redis.call('EXPIRE', key, windowSeconds)
          ttl = windowSeconds  -- Update TTL since we just set it
        end
        
        -- Get current time to calculate exact reset time
        local resetTime = redis.call('TIME')
        local resetTimestamp = tonumber(resetTime[1]) * 1000 + math.floor(tonumber(resetTime[2]) / 1000)
        local actualResetTime = resetTimestamp + (ttl * 1000)
        
        -- Check if within limit
        if count <= limit then
          if not dryRun then
            -- Already incremented above
          end
          return {1, count, actualResetTime}
        else
          -- Rate limit exceeded
          local remainingMs = actualResetTime - resetTimestamp
          return {0, count, actualResetTime, remainingMs}
        end
      `;

      const result = (await client.eval(
        script,
        1,
        redisKey,
        limit.toString(),
        windowSeconds.toString(),
        consumePoints.toString(),
        (options?.dryRun === true).toString(),
      )) as [number, number, number, number?];

      const [allowed, count, resetTime, retryAfter] = result;
      const isAllowed = allowed === 1;

      // If dry run, we need to decrement since we incremented
      if (options?.dryRun === true && isAllowed) {
        await client.decrby(redisKey, consumePoints);
      }

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
        retryAfter: retryAfter || windowSeconds * 1000,
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

    try {
      const count = await client.get(redisKey);
      return count ? parseInt(count, 10) : 0;
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
