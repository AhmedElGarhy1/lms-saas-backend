import { Config } from '@/shared/config/config';

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
    maxAttempts: Config.websocket.retry.maxAttempts,
    baseDelayMs: Config.websocket.retry.baseDelayMs,
  },

  rateLimit: {
    user: Config.websocket.rateLimit.user,
    ttl: Config.websocket.rateLimit.ttl,
  },

  connectionRateLimit: {
    ip: {
      limit: Config.websocket.connectionRateLimit.ip.limit,
      windowSeconds: Config.websocket.connectionRateLimit.ip.windowSeconds,
    },
    user: {
      limit: Config.websocket.connectionRateLimit.user.limit,
      windowSeconds: Config.websocket.connectionRateLimit.user.windowSeconds,
    },
    failClosed: Config.websocket.connectionRateLimit.failClosed,
  },

  connectionTTL: Config.websocket.connectionTtl,
});
