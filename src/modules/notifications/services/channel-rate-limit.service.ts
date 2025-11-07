import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { LoggerService } from '@/shared/services/logger.service';
import { SlidingWindowRateLimiter } from '../utils/sliding-window-rate-limit';
import { Config } from '@/shared/config/config';

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
  ) {
    this.redisKeyPrefix = Config.redis.keyPrefix;

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
   * Uses a single window for all channels (simplified configuration)
   */
  private initializeChannelLimits(): Map<
    NotificationChannel,
    ChannelRateLimitConfig
  > {
    const limits = new Map<NotificationChannel, ChannelRateLimitConfig>();

    // Get single window for all channels (simplified from per-channel windows)
    const windowSeconds = Config.notification.rateLimit.windowSeconds;

    // IN_APP: Higher limit for real-time notifications
    limits.set(NotificationChannel.IN_APP, {
      limit: Config.notification.rateLimit.inApp,
      windowSeconds,
    });

    // EMAIL: Moderate limit
    limits.set(NotificationChannel.EMAIL, {
      limit: Config.notification.rateLimit.email,
      windowSeconds,
    });

    // SMS: Lower limit (costs more)
    limits.set(NotificationChannel.SMS, {
      limit: Config.notification.rateLimit.sms,
      windowSeconds,
    });

    // WHATSAPP: Moderate limit
    limits.set(NotificationChannel.WHATSAPP, {
      limit: Config.notification.rateLimit.whatsapp,
      windowSeconds,
    });

    // PUSH: Higher limit (no direct cost)
    limits.set(NotificationChannel.PUSH, {
      limit: Config.notification.rateLimit.push,
      windowSeconds,
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
