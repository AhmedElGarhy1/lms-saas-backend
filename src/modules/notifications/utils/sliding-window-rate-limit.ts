import { Logger } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from './notification-redis-key-builder';

/**
 * Sliding window rate limiter using Redis sorted sets
 * Provides smoother rate limiting compared to fixed window counters
 */
export class SlidingWindowRateLimiter {
  private readonly logger: Logger = new Logger(SlidingWindowRateLimiter.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if request is within rate limit using sliding window algorithm
   * @param key - Redis key for the rate limit (e.g., user ID, socket ID)
   * @param limit - Maximum number of requests allowed
   * @param windowSeconds - Time window in seconds
   * @returns true if within limit, false if exceeded
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const redisKey = notificationKeys.rateLimit(key);
    const client = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Use Lua script for atomic operations
      const script = `
        local key = KEYS[1]
        local windowStart = ARGV[1]
        local now = ARGV[2]
        local limit = tonumber(ARGV[3])
        local windowSeconds = tonumber(ARGV[4])
        
        -- Remove old entries outside the sliding window
        redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
        
        -- Count current requests in the window
        local count = redis.call('ZCARD', key)
        
        if count < limit then
          -- Add current request
          redis.call('ZADD', key, now, now)
          redis.call('EXPIRE', key, windowSeconds)
          return {1, count + 1}
        else
          -- Rate limit exceeded
          return {0, count}
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
      )) as [number, number];

      const [allowed] = result;
      return allowed === 1;
    } catch (error) {
      // On Redis error, allow the request (fail open)
      this.logger.error(
        `Sliding window rate limit check failed for key ${key} - limit: ${limit}, windowSeconds: ${windowSeconds}`,
        error instanceof Error ? error.stack : String(error),
      );
      return true; // Fail open - allow request
    }
  }

  /**
   * Get current request count in the sliding window
   * @param key - Redis key for the rate limit
   * @param windowSeconds - Time window in seconds
   * @returns Current request count
   */
  async getCurrentCount(key: string, windowSeconds: number): Promise<number> {
    const redisKey = notificationKeys.rateLimit(key);
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

  /**
   * Reset rate limit for a key (for testing or manual override)
   * @param key - Redis key to reset
   */
  async reset(key: string): Promise<void> {
    const redisKey = notificationKeys.rateLimit(key);
    const client = this.redisService.getClient();
    await client.del(redisKey);
  }
}
