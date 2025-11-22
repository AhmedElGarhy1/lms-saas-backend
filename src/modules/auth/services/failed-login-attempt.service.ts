import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { Config } from '@/shared/config/config';
import { BaseService } from '@/shared/common/services/base.service';
import { AuthRedisKeyBuilder } from '../utils/auth-redis-key-builder';

/**
 * Service for managing failed login attempts using Redis
 * Uses Redis TTL for automatic expiration (lockoutDurationMinutes)
 * Single source of truth: lockoutDurationMinutes controls both lockout duration and counter reset
 */
@Injectable()
export class FailedLoginAttemptService extends BaseService {
  private readonly logger: Logger = new Logger(FailedLoginAttemptService.name);

  constructor(private readonly redisService: RedisService) {
    super();
  }

  /**
   * Increment failed login attempts counter atomically
   * Sets TTL to lockoutDurationMinutes on first attempt
   * @param userId - User ID
   * @returns Current attempt count and whether lockout threshold reached
   */
  async incrementFailedAttempts(
    userId: string,
  ): Promise<{ attempts: number; isLocked: boolean }> {
    const redisKey = AuthRedisKeyBuilder.failedLoginAttempts(userId);
    const client = this.redisService.getClient();
    const maxAttempts = Config.auth.maxFailedLoginAttempts;
    const ttlSeconds = Config.auth.lockoutDurationMinutes * 60; // Convert minutes to seconds

    try {
      // Lua script for atomic INCR + EXPIRE
      const script = `
        local key = KEYS[1]
        local maxAttempts = tonumber(ARGV[1])
        local ttlSeconds = tonumber(ARGV[2])
        
        -- Increment counter
        local count = redis.call('INCR', key)
        
        -- Set TTL only if key is new (count == 1) or doesn't have TTL
        if count == 1 or redis.call('TTL', key) == -1 then
          redis.call('EXPIRE', key, ttlSeconds)
        end
        
        -- Return count and whether lockout threshold reached
        return {count, count >= maxAttempts and 1 or 0}
      `;

      const result = (await client.eval(
        script,
        1,
        redisKey,
        maxAttempts.toString(),
        ttlSeconds.toString(),
      )) as [number, number];

      const [attempts, isLockedFlag] = result;
      const isLocked = isLockedFlag === 1;

      return { attempts, isLocked };
    } catch (error) {
      // Fail-open: if Redis fails, log error but don't block login
      this.logger.error(
        `Failed to increment login attempts in Redis for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Return safe defaults
      return { attempts: 0, isLocked: false };
    }
  }

  /**
   * Check if user is locked out
   * @param userId - User ID
   * @returns true if attempts >= maxAttempts, false otherwise
   */
  async isLockedOut(userId: string): Promise<boolean> {
    const redisKey = AuthRedisKeyBuilder.failedLoginAttempts(userId);
    const client = this.redisService.getClient();
    const maxAttempts = Config.auth.maxFailedLoginAttempts;

    try {
      const count = await client.get(redisKey);
      if (!count) return false;

      const attempts = parseInt(count, 10);
      return attempts >= maxAttempts;
    } catch (error) {
      // Fail-open: if Redis fails, return false (allow login)
      this.logger.error(
        `Failed to check lockout status in Redis for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * Get current failed login attempts count
   * @param userId - User ID
   * @returns Current attempt count (0 if key doesn't exist or expired)
   */
  async getFailedAttempts(userId: string): Promise<number> {
    const redisKey = AuthRedisKeyBuilder.failedLoginAttempts(userId);
    const client = this.redisService.getClient();

    try {
      const count = await client.get(redisKey);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      // Fail-open: if Redis fails, return 0 (no attempts tracked)
      this.logger.error(
        `Failed to get login attempts from Redis for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  /**
   * Reset failed login attempts (delete Redis key)
   * @param userId - User ID
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    const redisKey = AuthRedisKeyBuilder.failedLoginAttempts(userId);
    const client = this.redisService.getClient();

    try {
      await client.del(redisKey);
    } catch (error) {
      // Fail-open: log error but don't throw
      this.logger.error(
        `Failed to reset login attempts in Redis for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
