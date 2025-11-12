import {
  RateLimitConfig,
  RateLimitStrategyType,
} from '../interfaces/rate-limit-config.interface';

/**
 * Default rate limit configuration
 */
export const defaultRateLimitConfig: RateLimitConfig = {
  strategy: RateLimitStrategyType.SLIDING_WINDOW,
  limit: 50,
  windowSeconds: 60,
  failOpen: true,
  consumePoints: 1,
};

/**
 * Context-specific rate limit configurations
 */
export const contextRateLimitConfigs: Record<string, RateLimitConfig> = {
  /**
   * HTTP endpoint rate limiting
   * Uses fixed window for simplicity and performance
   */
  http: {
    strategy: RateLimitStrategyType.FIXED_WINDOW,
    limit: 50,
    windowSeconds: 60,
    failOpen: true,
    consumePoints: 1,
  },

  /**
   * WebSocket connection rate limiting
   * Uses sliding window for smoother limiting
   */
  websocket: {
    strategy: RateLimitStrategyType.SLIDING_WINDOW,
    limit: 100,
    windowSeconds: 60,
    failOpen: true,
    consumePoints: 1,
  },

  /**
   * Notification channel rate limiting
   * Uses sliding window for smoother limiting
   */
  notification: {
    strategy: RateLimitStrategyType.SLIDING_WINDOW,
    limit: 100,
    windowSeconds: 60,
    failOpen: true,
    consumePoints: 1,
  },
};
