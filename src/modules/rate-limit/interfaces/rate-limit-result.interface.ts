/**
 * Result of a rate limit check operation
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Number of requests remaining in the current window
   */
  remaining: number;

  /**
   * Total limit for the window (for consistent X-RateLimit-Limit header)
   */
  limit: number;

  /**
   * Unix timestamp (milliseconds) when the rate limit window resets
   */
  resetTime?: number;

  /**
   * Milliseconds until the next request is allowed (useful for retry-after header)
   */
  retryAfter?: number;
}
