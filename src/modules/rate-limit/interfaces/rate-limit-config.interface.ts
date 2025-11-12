/**
 * Strategy types for rate limiting
 */
export enum RateLimitStrategyType {
  /**
   * Sliding window algorithm using Redis sorted sets
   * Provides smoother rate limiting compared to fixed window
   */
  SLIDING_WINDOW = 'SLIDING_WINDOW',

  /**
   * Fixed window algorithm using Redis INCR
   * Simpler and faster, suitable for HTTP endpoints
   */
  FIXED_WINDOW = 'FIXED_WINDOW',

  /**
   * Adapter for @nestjs/throttler package
   * For backward compatibility during migration
   */
  THROTTLER = 'THROTTLER',

  /**
   * Adapter for rate-limiter-flexible package
   * Used for WebSocket connection rate limiting
   */
  RATE_LIMITER_FLEXIBLE = 'RATE_LIMITER_FLEXIBLE',
}

/**
 * Configuration for a rate limit strategy
 */
export interface RateLimitConfig {
  /**
   * Strategy type to use
   */
  strategy: RateLimitStrategyType;

  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Optional key prefix for Redis keys
   */
  keyPrefix?: string;

  /**
   * If true, allow requests when rate limiter is unavailable (fail open)
   * If false, block requests when rate limiter is unavailable (fail closed)
   * Default: true
   */
  failOpen?: boolean;

  /**
   * Number of points to consume per request (default: 1)
   * Useful for burst scenarios where different actions consume different amounts
   */
  consumePoints?: number;
}

/**
 * Context-specific rate limit configuration
 */
export interface RateLimitContextConfig {
  /**
   * Default configuration applied to all contexts
   */
  default: RateLimitConfig;

  /**
   * Context-specific configurations
   * Key: context name (http, websocket, notification)
   * Value: configuration that overrides default
   */
  contexts?: Record<string, RateLimitConfig>;
}

/**
 * Module options for RateLimitModule.forRoot() and forRootAsync()
 */
export interface RateLimitModuleOptions {
  /**
   * Default configuration
   */
  default: RateLimitConfig;

  /**
   * Context-specific configurations
   */
  contexts?: Record<string, RateLimitConfig>;
}
