import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { LoggerService } from '@/shared/services/logger.service';
import { SlidingWindowRateLimiter } from '../utils/sliding-window-rate-limit';

interface ChannelRateLimitConfig {
  limit: number;
  windowSeconds: number;
}

/**
 * Service for managing per-channel rate limits
 * Provides channel-specific rate limiting configuration
 */
@Injectable()
export class ChannelRateLimitService {
  private readonly redisKeyPrefix: string;
  private readonly rateLimiter: SlidingWindowRateLimiter;
  private readonly channelLimits: Map<
    NotificationChannel,
    ChannelRateLimitConfig
  >;
  private readonly defaultLimit: ChannelRateLimitConfig;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.redisKeyPrefix =
      this.configService.get<string>('REDIS_KEY_PREFIX') || 'dev';

    // Initialize sliding window rate limiter
    this.rateLimiter = new SlidingWindowRateLimiter(
      this.redisService,
      this.logger,
      this.redisKeyPrefix,
    );

    // Default rate limit (fallback)
    this.defaultLimit = {
      limit: 100,
      windowSeconds: 60,
    };

    // Initialize channel-specific limits from config
    this.channelLimits = this.initializeChannelLimits();
  }

  /**
   * Initialize channel-specific rate limits from environment variables
   */
  private initializeChannelLimits(): Map<
    NotificationChannel,
    ChannelRateLimitConfig
  > {
    const limits = new Map<NotificationChannel, ChannelRateLimitConfig>();

    // IN_APP: Higher limit for real-time notifications
    limits.set(NotificationChannel.IN_APP, {
      limit:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RATE_LIMIT_IN_APP',
            '100',
          ),
          10,
        ) || 100,
      windowSeconds:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RATE_LIMIT_IN_APP_WINDOW',
            '60',
          ),
          10,
        ) || 60,
    });

    // EMAIL: Moderate limit
    limits.set(NotificationChannel.EMAIL, {
      limit:
        parseInt(
          this.configService.get<string>('NOTIFICATION_RATE_LIMIT_EMAIL', '50'),
          10,
        ) || 50,
      windowSeconds:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RATE_LIMIT_EMAIL_WINDOW',
            '60',
          ),
          10,
        ) || 60,
    });

    // SMS: Lower limit (costs more)
    limits.set(NotificationChannel.SMS, {
      limit:
        parseInt(
          this.configService.get<string>('NOTIFICATION_RATE_LIMIT_SMS', '20'),
          10,
        ) || 20,
      windowSeconds:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RATE_LIMIT_SMS_WINDOW',
            '60',
          ),
          10,
        ) || 60,
    });

    // WHATSAPP: Moderate limit
    limits.set(NotificationChannel.WHATSAPP, {
      limit:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RATE_LIMIT_WHATSAPP',
            '30',
          ),
          10,
        ) || 30,
      windowSeconds:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RATE_LIMIT_WHATSAPP_WINDOW',
            '60',
          ),
          10,
        ) || 60,
    });

    // PUSH: Higher limit (no direct cost)
    limits.set(NotificationChannel.PUSH, {
      limit:
        parseInt(
          this.configService.get<string>('NOTIFICATION_RATE_LIMIT_PUSH', '80'),
          10,
        ) || 80,
      windowSeconds:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RATE_LIMIT_PUSH_WINDOW',
            '60',
          ),
          10,
        ) || 60,
    });

    return limits;
  }

  /**
   * Check if request is within rate limit for a specific channel
   * @param userId - User ID
   * @param channel - Notification channel
   * @returns true if within limit, false if exceeded
   */
  async checkChannelRateLimit(
    userId: string,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const config = this.channelLimits.get(channel) || this.defaultLimit;
    const key = `channel:${channel}:user:${userId}`;

    return this.rateLimiter.checkRateLimit(
      key,
      config.limit,
      config.windowSeconds,
    );
  }

  /**
   * Get rate limit configuration for a channel
   * @param channel - Notification channel
   * @returns Rate limit configuration
   */
  getChannelRateLimitConfig(
    channel: NotificationChannel,
  ): ChannelRateLimitConfig {
    return this.channelLimits.get(channel) || this.defaultLimit;
  }

  /**
   * Get all channel rate limit configurations
   * @returns Map of channel to rate limit config
   */
  getAllChannelRateLimits(): Map<NotificationChannel, ChannelRateLimitConfig> {
    return new Map(this.channelLimits);
  }
}
