import { Logger } from '@nestjs/common';
import {
  IRateLimitStrategy,
  RateLimitCheckOptions,
} from '../../interfaces/rate-limit-strategy.interface';
import { RateLimitResult } from '../../interfaces/rate-limit-result.interface';
import { RateLimitConfig } from '../../interfaces/rate-limit-config.interface';

/**
 * Base class for rate limit strategies
 * Provides common error handling, logging, and telemetry hooks
 */
export abstract class BaseRateLimitStrategy implements IRateLimitStrategy {
  protected readonly logger: Logger;

  constructor(protected readonly config: RateLimitConfig) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Check if a request is within the rate limit
   * Implemented by subclasses
   */
  abstract checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    options?: RateLimitCheckOptions,
  ): Promise<RateLimitResult>;

  /**
   * Get the current request count
   * Implemented by subclasses
   */
  abstract getCurrentCount(key: string, windowSeconds: number): Promise<number>;

  /**
   * Reset the rate limit for a key
   * Implemented by subclasses
   */
  abstract reset(key: string): Promise<void>;

  /**
   * Get the strategy name
   * Implemented by subclasses
   */
  abstract getStrategyName(): string;

  /**
   * Handle errors consistently across all strategies
   * Implements fail-open/fail-closed logic based on config
   * @param err - The error that occurred
   * @param key - The rate limit key
   * @param limit - The rate limit
   * @param windowSeconds - The window size in seconds
   * @returns Rate limit result based on failOpen configuration
   */
  protected handleError(
    err: Error,
    key: string,
    limit: number,
    windowSeconds: number,
  ): RateLimitResult {
    this.logger.error(
      `Rate limit check failed for key ${key} - limit: ${limit}, windowSeconds: ${windowSeconds}`,
      err.stack || String(err),
    );

    // Emit error metric
    this.emitMetric('error', key, { error: err.message });

    // Fail-open: allow request on error
    if (this.config.failOpen !== false) {
      this.logger.warn(
        `Failing open: allowing request due to rate limiter error for key ${key}`,
      );
      return {
        allowed: true,
        remaining: limit,
        limit,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    }

    // Fail-closed: block request on error
    this.logger.warn(
      `Failing closed: blocking request due to rate limiter error for key ${key}`,
    );
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetTime: Date.now() + windowSeconds * 1000,
      retryAfter: windowSeconds * 1000,
    };
  }

  /**
   * Emit telemetry/metrics event
   * Can be overridden by subclasses for metrics integration
   * @param event - Event type (hit, block, error)
   * @param key - Rate limit key
   * @param metadata - Optional metadata
   */
  protected emitMetric(
    event: 'hit' | 'block' | 'error',
    key: string,
    metadata?: Record<string, unknown>,
  ): void {
    // Default implementation: no-op
    // Subclasses can override to integrate with metrics systems
    // Suppress unused parameter warnings - these are intentionally unused in base implementation
    void event;
    void key;
    void metadata;
    // Example: this.metricsService.recordRateLimit(event, key, metadata);
  }
}
