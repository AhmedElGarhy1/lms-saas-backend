import { Injectable, Inject } from '@nestjs/common';
import { RateLimitFactoryService } from './rate-limit-factory.service';
import {
  RateLimitConfig,
  RateLimitModuleOptions,
} from '../interfaces/rate-limit-config.interface';
import {
  RateLimitCheckOptions,
  IRateLimitStrategy,
} from '../interfaces/rate-limit-strategy.interface';
import { RateLimitResult } from '../interfaces/rate-limit-result.interface';
import { RATE_LIMIT_CONFIG } from '../constants/rate-limit.constants';
import { defaultRateLimitConfig } from '../config/rate-limit.config';

/**
 * Unified rate limit service
 * Provides consistent API across all rate limiting strategies
 */
@Injectable()
export class RateLimitService {
  constructor(
    private readonly factory: RateLimitFactoryService,
    @Inject(RATE_LIMIT_CONFIG)
    private readonly moduleOptions: RateLimitModuleOptions,
  ) {}

  /**
   * Check if a request is within the rate limit
   * Automatically selects strategy based on context
   * @param key - Unique identifier (user ID, IP, etc.)
   * @param limit - Maximum requests allowed (overrides config)
   * @param windowSeconds - Time window in seconds (overrides config)
   * @param options - Additional options including context
   * @returns Rate limit result
   */
  async checkLimit(
    key: string,
    limit?: number,
    windowSeconds?: number,
    options?: RateLimitCheckOptions,
  ): Promise<RateLimitResult> {
    const config = this.mergeConfig(options?.context, {
      limit,
      windowSeconds,
      ...options,
    });

    const strategy = this.getStrategyForContext(config, options?.context);

    const result = await strategy.checkLimit(
      key,
      config.limit,
      config.windowSeconds,
      options,
    );

    // Normalize result to ensure consistent shape
    return this.normalizeResult(result, config);
  }

  /**
   * Get current request count without consuming points
   * @param key - Unique identifier
   * @param windowSeconds - Time window in seconds
   * @param context - Optional context identifier
   * @returns Current request count
   */
  async getCurrentCount(
    key: string,
    windowSeconds?: number,
    context?: string,
  ): Promise<number> {
    const config = this.mergeConfig(context, { windowSeconds });
    const strategy = this.getStrategyForContext(config, context);

    return strategy.getCurrentCount(key, config.windowSeconds);
  }

  /**
   * Reset rate limit for a key
   * @param key - Unique identifier
   * @param context - Optional context identifier
   */
  async reset(key: string, context?: string): Promise<void> {
    const config = this.getConfigForContext(context);
    const strategy = this.getStrategyForContext(config, context);

    return strategy.reset(key);
  }

  /**
   * Get strategy for a specific context
   * @param config - Rate limit configuration
   * @param context - Optional context identifier
   * @returns Strategy instance
   */
  private getStrategyForContext(
    config: RateLimitConfig,
    context?: string,
  ): IRateLimitStrategy {
    return this.factory.getStrategy(config.strategy, config, context);
  }

  /**
   * Get configuration for a specific context
   * Merges default + context-specific + local overrides
   * @param context - Optional context identifier
   * @param localOverrides - Local configuration overrides
   * @returns Merged configuration
   */
  private getConfigForContext(
    context?: string,
    localOverrides?: Partial<RateLimitConfig>,
  ): RateLimitConfig {
    const defaultConfig = this.moduleOptions.default || defaultRateLimitConfig;
    const contextConfig = context
      ? this.moduleOptions.contexts?.[context]
      : undefined;

    return this.mergeConfigValues(defaultConfig, contextConfig, localOverrides);
  }

  /**
   * Merge configuration values
   * @param global - Global/default configuration
   * @param context - Context-specific configuration
   * @param local - Local overrides
   * @returns Merged configuration
   */
  private mergeConfig(
    context?: string,
    localOverrides?: Partial<RateLimitConfig>,
  ): RateLimitConfig {
    return this.getConfigForContext(context, localOverrides);
  }

  /**
   * Merge configuration values with proper precedence
   * @param global - Global configuration
   * @param context - Context configuration
   * @param local - Local overrides
   * @returns Merged configuration
   */
  private mergeConfigValues(
    global: RateLimitConfig,
    context?: RateLimitConfig,
    local?: Partial<RateLimitConfig>,
  ): RateLimitConfig {
    return {
      ...global,
      ...context,
      ...local,
    };
  }

  /**
   * Normalize rate limit result to ensure consistent shape
   * @param result - Result from strategy
   * @param config - Configuration used
   * @returns Normalized result
   */
  private normalizeResult(
    result: RateLimitResult,
    config: RateLimitConfig,
  ): RateLimitResult {
    // Ensure all required fields are present
    return {
      allowed: result.allowed,
      remaining: Math.max(0, result.remaining ?? 0),
      limit: result.limit ?? config.limit,
      resetTime: result.resetTime,
      retryAfter: result.retryAfter,
    };
  }
}
