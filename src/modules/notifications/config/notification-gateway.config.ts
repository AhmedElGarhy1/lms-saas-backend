import { ConfigService } from '@nestjs/config';

export interface NotificationGatewayConfig {
  redisPrefix: string;
  retry: {
    maxAttempts: number;
    baseDelayMs: number;
  };
  rateLimit: {
    user: number;
    socket: number;
    ttl: number;
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
    socket:
      parseInt(
        configService.get<string>('WEBSOCKET_RATE_LIMIT_SOCKET') ?? '50',
        10,
      ) || 50,
    ttl: 60, // 1 minute in seconds
  },

  connectionTTL: 7 * 24 * 60 * 60, // 7 days in seconds
});
