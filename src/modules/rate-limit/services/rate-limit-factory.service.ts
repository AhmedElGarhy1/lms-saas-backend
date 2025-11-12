import { Injectable, Optional } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { RateLimitStrategyType } from '../interfaces/rate-limit-config.interface';
import { IRateLimitStrategy } from '../interfaces/rate-limit-strategy.interface';
import { RateLimitConfig } from '../interfaces/rate-limit-config.interface';
import { SlidingWindowStrategy } from './strategies/sliding-window.strategy';
import { FixedWindowStrategy } from './strategies/fixed-window.strategy';
import { RateLimiterFlexibleAdapter } from './strategies/adapters/rate-limiter-flexible.adapter';
import { ThrottlerAdapter } from './strategies/adapters/throttler.adapter';

/**
 * Factory service for creating rate limit strategies
 * Caches strategy instances by type and context to avoid duplicate instances
 */
@Injectable()
export class RateLimitFactoryService {
  private readonly cache = new Map<string, IRateLimitStrategy>();

  constructor(
    private readonly redisService: RedisService,
    @Optional() private readonly throttlerStorage?: ThrottlerStorage,
  ) {}

  /**
   * Get or create a strategy instance
   * Caches instances by type and context to ensure singletons
   * @param type - Strategy type
   * @param config - Strategy configuration
   * @param context - Optional context identifier
   * @returns Strategy instance
   */
  getStrategy(
    type: RateLimitStrategyType,
    config: RateLimitConfig,
    context?: string,
  ): IRateLimitStrategy {
    const cacheKey = `${type}:${context || 'default'}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const strategy = this.createStrategy(type, config, context);
    this.cache.set(cacheKey, strategy);

    return strategy;
  }

  /**
   * Create a new strategy instance
   * @param type - Strategy type
   * @param config - Strategy configuration
   * @param context - Optional context identifier
   * @returns New strategy instance
   */
  private createStrategy(
    type: RateLimitStrategyType,
    config: RateLimitConfig,
    context?: string,
  ): IRateLimitStrategy {
    switch (type) {
      case RateLimitStrategyType.SLIDING_WINDOW:
        return new SlidingWindowStrategy(config, this.redisService);

      case RateLimitStrategyType.FIXED_WINDOW:
        return new FixedWindowStrategy(config, this.redisService);

      case RateLimitStrategyType.RATE_LIMITER_FLEXIBLE:
        return new RateLimiterFlexibleAdapter(config, this.redisService);

      case RateLimitStrategyType.THROTTLER:
        return new ThrottlerAdapter(config, this.throttlerStorage);

      default:
        throw new Error(`Unknown rate limit strategy type: ${type}`);
    }
  }

  /**
   * Clear the strategy cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
