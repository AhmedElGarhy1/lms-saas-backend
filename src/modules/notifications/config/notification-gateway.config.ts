import { Config } from '@/shared/config/config';
import { WebSocketConfig } from './notification.config';

export interface NotificationGatewayConfig {
  redisPrefix: string;
  retry: {
    maxAttempts: number;
    baseDelayMs: number;
  };
  rateLimit: {
    user: number;
    ttl: number;
  };
  connectionRateLimit: {
    ip: {
      limit: number; // Connection attempts per IP per window
      windowSeconds: number; // Time window in seconds
    };
    user: {
      limit: number; // Connection attempts per user per window
      windowSeconds: number; // Time window in seconds
    };
    failClosed?: boolean; // Optional: fail closed if rate limiter unavailable (default: false)
  };
  connectionTTL: number;
}

/**
 * Configuration factory for NotificationGateway
 * Extracts all environment variable parsing into a single place
 */
export const notificationGatewayConfig = (): NotificationGatewayConfig => ({
  redisPrefix: Config.redis.keyPrefix,

  retry: {
    maxAttempts: WebSocketConfig.retry.maxAttempts,
    baseDelayMs: WebSocketConfig.retry.baseDelayMs,
  },

  rateLimit: {
    user: WebSocketConfig.rateLimit.user,
    ttl: WebSocketConfig.rateLimit.ttl,
  },

  connectionRateLimit: {
    ip: {
      limit: WebSocketConfig.connectionRateLimit.ip.limit,
      windowSeconds: WebSocketConfig.connectionRateLimit.ip.windowSeconds,
    },
    user: {
      limit: WebSocketConfig.connectionRateLimit.user.limit,
      windowSeconds: WebSocketConfig.connectionRateLimit.user.windowSeconds,
    },
    failClosed: WebSocketConfig.connectionRateLimit.failClosed,
  },

  connectionTTL: WebSocketConfig.connectionTtl,
});
