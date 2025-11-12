import { RateLimitResult } from './rate-limit-result.interface';

/**
 * Options for rate limit check operations
 */
export interface RateLimitCheckOptions {
  /**
   * Context identifier (http, websocket, notification)
   */
  context?: string;

  /**
   * Identifier for the rate limit key (user ID, IP, etc.)
   */
  identifier?: string;

  /**
   * Number of points to consume (for burst scenarios, default: 1)
   */
  consumePoints?: number;

  /**
   * If true, simulate the check without consuming points
   */
  dryRun?: boolean;
}

/**
 * Strategy interface for rate limiting implementations
 */
export interface IRateLimitStrategy {
  /**
   * Check if a request is within the rate limit
   * @param key - Unique key for the rate limit (e.g., user ID, IP address)
   * @param limit - Maximum number of requests allowed
   * @param windowSeconds - Time window in seconds
   * @param options - Additional options for the check
   * @returns Result indicating if the request is allowed and remaining count
   */
  checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    options?: RateLimitCheckOptions,
  ): Promise<RateLimitResult>;

  /**
   * Get the current request count for a key without consuming points
   * @param key - Unique key for the rate limit
   * @param windowSeconds - Time window in seconds
   * @returns Current request count
   */
  getCurrentCount(key: string, windowSeconds: number): Promise<number>;

  /**
   * Reset the rate limit for a key (for testing or manual override)
   * @param key - Unique key to reset
   */
  reset(key: string): Promise<void>;

  /**
   * Get the name of the strategy (for logging and debugging)
   * @returns Strategy name
   */
  getStrategyName(): string;
}
