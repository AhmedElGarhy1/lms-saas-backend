import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';
import { BaseService } from '@/shared/common/services/base.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationConfig } from '../config/notification.config';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation, allow requests
  OPEN = 'OPEN', // Circuit is open, block requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Sliding window circuit breaker service using Redis ZSET
 * Prevents false positives by tracking failures within a time window
 * instead of total failure count
 */
@Injectable()
export class NotificationCircuitBreakerService extends BaseService {
  private readonly logger: Logger = new Logger(
    NotificationCircuitBreakerService.name,
  );
  private readonly errorThreshold: number;
  private readonly windowSeconds: number;
  private readonly resetTimeoutSeconds: number;

  constructor(private readonly redisService: RedisService) {
    super();
    this.errorThreshold = NotificationConfig.circuitBreaker.errorThreshold;
    this.windowSeconds = NotificationConfig.circuitBreaker.windowSeconds;
    this.resetTimeoutSeconds =
      NotificationConfig.circuitBreaker.resetTimeoutSeconds;
  }

  /**
   * Get Redis key for failures tracking
   */
  private getFailureKey(channel: NotificationChannel): string {
    return notificationKeys.circuitBreakerFailures(channel);
  }

  /**
   * Get Redis key for state tracking
   */
  private getStateKey(channel: NotificationChannel): string {
    return notificationKeys.circuitBreakerState(channel);
  }

  /**
   * Record a failure for a channel
   */
  async recordFailure(channel: NotificationChannel): Promise<void> {
    const failureKey = this.getFailureKey(channel);
    const client = this.redisService.getClient();
    const now = Date.now();

    try {
      // Add failure timestamp to ZSET
      await client.zadd(failureKey, now, now.toString());
      // Set expiry on the key (window + reset timeout)
      await client.expire(
        failureKey,
        this.windowSeconds + this.resetTimeoutSeconds,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record circuit breaker failure for ${channel}`,
        error,
        { channel },
      );
    }
  }

  /**
   * Record a success for a channel (used for half-open recovery)
   */
  async recordSuccess(channel: NotificationChannel): Promise<void> {
    const failureKey = this.getFailureKey(channel);
    const client = this.redisService.getClient();

    try {
      // Clear all failures on success (circuit closes)
      await client.del(failureKey);
      // Clear state (will be CLOSED on next check)
      await client.del(this.getStateKey(channel));
    } catch (error) {
      this.logger.error(
        `Failed to record circuit breaker success for ${channel}`,
        error,
        { channel },
      );
    }
  }

  /**
   * Check if circuit should be opened based on sliding window
   */
  private async shouldOpenCircuit(
    channel: NotificationChannel,
  ): Promise<boolean> {
    const failureKey = this.getFailureKey(channel);
    const client = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - this.windowSeconds * 1000;

    try {
      // Use Lua script for atomic operations
      const script = `
        local key = KEYS[1]
        local windowStart = tonumber(ARGV[1])
        local threshold = tonumber(ARGV[2])
        local windowSeconds = tonumber(ARGV[3])
        
        -- Remove old failures outside the sliding window
        redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
        
        -- Count failures in the window
        local count = redis.call('ZCARD', key)
        
        -- Set expiry
        redis.call('EXPIRE', key, windowSeconds + 60)
        
        -- Return whether count exceeds threshold
        if count >= threshold then
          return 1
        else
          return 0
        end
      `;

      const result = (await client.eval(
        script,
        1,
        failureKey,
        windowStart.toString(),
        this.errorThreshold.toString(),
        this.windowSeconds.toString(),
      )) as number;

      return result === 1;
    } catch (error) {
      // On Redis error, fail closed (allow requests) - safer than blocking
      this.logger.error(
        `Circuit breaker check failed for ${channel}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false; // Fail closed - allow requests
    }
  }

  /**
   * Get health status for all channels
   */
  async getHealthStatus(): Promise<
    Record<
      NotificationChannel,
      {
        state: CircuitState;
        failureCount: number;
        lastFailureTime: Date | null;
        isHealthy: boolean;
      }
    >
  > {
    const status: Record<NotificationChannel, any> = {} as any;

    for (const channel of Object.values(NotificationChannel)) {
      const state = await this.getCircuitState(channel);
      const failureKey = this.getFailureKey(channel);
      const client = this.redisService.getClient();

      // Get failure count in window
      const now = Date.now();
      const windowStart = now - this.windowSeconds * 1000;
      const failures = await client.zrangebyscore(failureKey, windowStart, now);

      const lastFailure =
        failures.length > 0
          ? new Date(parseInt(failures[failures.length - 1]))
          : null;

      status[channel] = {
        state,
        failureCount: failures.length,
        lastFailureTime: lastFailure,
        isHealthy:
          state === CircuitState.CLOSED &&
          failures.length < this.errorThreshold,
      };
    }

    return status;
  }

  /**
   * Explicitly check if circuit is open (for monitoring)
   */
  async isOpen(channel: NotificationChannel): Promise<boolean> {
    const state = await this.getCircuitState(channel);
    return state === CircuitState.OPEN;
  }

  /**
   * Get current circuit state for a channel
   */
  async getCircuitState(channel: NotificationChannel): Promise<CircuitState> {
    const stateKey = this.getStateKey(channel);
    const client = this.redisService.getClient();

    try {
      // Check if circuit should be open based on failures
      const shouldOpen = await this.shouldOpenCircuit(channel);

      if (shouldOpen) {
        // Check if we're in reset timeout (half-open state)
        const state = await client.get(stateKey);
        const stateTimestamp = state ? parseInt(state, 10) : 0;
        const now = Date.now();

        if (state === 'OPEN') {
          // Check if reset timeout has passed
          const timeSinceOpen = now - stateTimestamp;
          if (timeSinceOpen >= this.resetTimeoutSeconds * 1000) {
            // Enter half-open state
            await client.set(
              stateKey,
              'HALF_OPEN',
              'EX',
              this.resetTimeoutSeconds,
            );
            return CircuitState.HALF_OPEN;
          }
          return CircuitState.OPEN;
        } else if (state === 'HALF_OPEN') {
          // Already in half-open state
          return CircuitState.HALF_OPEN;
        } else {
          // Open circuit and record timestamp
          await client.set(stateKey, 'OPEN', 'EX', this.resetTimeoutSeconds);
          await client.set(
            `${stateKey}:timestamp`,
            now.toString(),
            'EX',
            this.resetTimeoutSeconds,
          );
          this.logger.warn(
            `Circuit breaker OPENED for ${channel} (failures exceeded threshold)`,
            {
              channel,
              threshold: this.errorThreshold,
              windowSeconds: this.windowSeconds,
            },
          );
          return CircuitState.OPEN;
        }
      } else {
        // Failures within threshold - circuit is closed
        const state = await client.get(stateKey);
        if (state === 'OPEN' || state === 'HALF_OPEN') {
          // Circuit was open/half-open but failures cleared - close it
          await client.del(stateKey);
          await client.del(`${stateKey}:timestamp`);
        }
        return CircuitState.CLOSED;
      }
    } catch (error) {
      // On error, fail closed (allow requests)
      this.logger.error(
        `Failed to get circuit state for ${channel}`,
        error instanceof Error ? error.stack : String(error),
      );
      return CircuitState.CLOSED;
    }
  }

  /**
   * Execute function with circuit breaker protection
   * @param channel - Notification channel
   * @param operation - Async operation to execute
   * @returns Result of operation or throws error
   */
  async executeWithCircuitBreaker<T>(
    channel: NotificationChannel,
    operation: () => Promise<T>,
  ): Promise<T> {
    const state = await this.getCircuitState(channel);

    if (state === CircuitState.OPEN) {
      // Circuit is open - reject request immediately
      const error = new Error(
        `Circuit breaker is OPEN for channel ${channel}. Requests are blocked.`,
      );
      this.logger.warn(`Request blocked by circuit breaker: ${channel}`, {
        channel,
        state,
      });
      throw error;
    }

    // Circuit is CLOSED or HALF_OPEN - attempt operation
    try {
      const result = await operation();

      // Success - if in HALF_OPEN, record success and close circuit
      if (state === CircuitState.HALF_OPEN) {
        await this.recordSuccess(channel);
      }

      return result;
    } catch (error) {
      // Failure - record it
      await this.recordFailure(channel);

      // If in HALF_OPEN, immediately open circuit again
      if (state === CircuitState.HALF_OPEN) {
        const stateKey = this.getStateKey(channel);
        const client = this.redisService.getClient();
        await client.set(stateKey, 'OPEN', 'EX', this.resetTimeoutSeconds);
        await client.set(
          `${stateKey}:timestamp`,
          Date.now().toString(),
          'EX',
          this.resetTimeoutSeconds,
        );
        this.logger.warn(
          `Circuit breaker re-opened for ${channel} (failure in HALF_OPEN state)`,
          { channel },
        );
      }

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Get failure count in current window (for monitoring)
   */
  async getFailureCount(channel: NotificationChannel): Promise<number> {
    const failureKey = this.getFailureKey(channel);
    const client = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - this.windowSeconds * 1000;

    try {
      // Remove old failures and count
      await client.zremrangebyscore(failureKey, '-inf', windowStart);
      const count = await client.zcard(failureKey);
      return count;
    } catch (error) {
      this.logger.error(`Failed to get failure count for ${channel}`, error);
      return 0;
    }
  }

  /**
   * Reset circuit breaker for a channel (for manual recovery/testing)
   */
  async reset(channel: NotificationChannel): Promise<void> {
    const failureKey = this.getFailureKey(channel);
    const stateKey = this.getStateKey(channel);
    const client = this.redisService.getClient();

    try {
      await client.del(failureKey);
      await client.del(stateKey);
      await client.del(`${stateKey}:timestamp`);
    } catch (error) {
      this.logger.error(
        `Failed to reset circuit breaker for ${channel}`,
        error,
        { channel },
      );
    }
  }
}
