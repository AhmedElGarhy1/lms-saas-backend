import { ConfigService } from '@nestjs/config';

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
export const notificationGatewayConfig = (
  configService: ConfigService,
): NotificationGatewayConfig => ({
  redisPrefix: configService.get<string>('REDIS_KEY_PREFIX') ?? 'dev',

  retry: {
    maxAttempts:
      parseInt(
        configService.get<string>('WEBSOCKET_RETRY_MAX_ATTEMPTS') ?? '3',
        10,
      ) || 3,
    baseDelayMs:
      parseInt(
        configService.get<string>('WEBSOCKET_RETRY_DELAY_MS') ?? '100',
        10,
      ) || 100,
  },

  rateLimit: {
    user:
      parseInt(
        configService.get<string>('WEBSOCKET_RATE_LIMIT_USER') ?? '100',
        10,
      ) || 100,
    ttl: 60, // 1 minute in seconds
  },

  connectionRateLimit: {
    ip: {
      limit:
        parseInt(
          configService.get<string>('WEBSOCKET_CONNECTION_RATE_LIMIT_IP') ??
            '10',
          10,
        ) || 10,
      windowSeconds:
        parseInt(
          configService.get<string>(
            'WEBSOCKET_CONNECTION_RATE_LIMIT_IP_WINDOW',
          ) ?? '60',
          10,
        ) || 60,
    },
    user: {
      limit:
        parseInt(
          configService.get<string>('WEBSOCKET_CONNECTION_RATE_LIMIT_USER') ??
            '5',
          10,
        ) || 5,
      windowSeconds:
        parseInt(
          configService.get<string>(
            'WEBSOCKET_CONNECTION_RATE_LIMIT_USER_WINDOW',
          ) ?? '60',
          10,
        ) || 60,
    },
    failClosed:
      configService.get<string>('WEBSOCKET_RATE_LIMIT_FAIL_CLOSED') === 'true',
  },

  connectionTTL: 7 * 24 * 60 * 60, // 7 days in seconds
});
