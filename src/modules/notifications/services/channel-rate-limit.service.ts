import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { BaseService } from '@/shared/common/services/base.service';
import { RateLimitService } from '@/modules/rate-limit/services/rate-limit.service';
import { CONCURRENCY_CONSTANTS } from '../constants/notification.constants';
import { NotificationConfig } from '../config/notification.config';

interface ChannelRateLimitConfig {
  limit: number;
  windowSeconds: number;
}

/**
 * Service for managing per-channel rate limits
 * Provides channel-specific rate limiting configuration
 *
 * Error Handling Strategy: FAIL_OPEN
 * - If rate limiting service fails (e.g., Redis unavailable), requests are allowed
 * - Prevents Redis failures from blocking all notifications
 * - Rate limiting is a protection mechanism, not a hard requirement
 * - Errors are logged but do not block notification processing
 *
 * @see ERROR_HANDLING_CONFIG.RATE_LIMITING
 */
@Injectable()
export class ChannelRateLimitService extends BaseService {
  private readonly channelLimits: Map<
    NotificationChannel,
    ChannelRateLimitConfig
  >;
  private readonly defaultLimit: ChannelRateLimitConfig;

  constructor(private readonly rateLimitService: RateLimitService) {
    super();

    // Default rate limit (fallback)
    this.defaultLimit = {
      limit: CONCURRENCY_CONSTANTS.DEFAULT_RATE_LIMIT,
      windowSeconds: CONCURRENCY_CONSTANTS.DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
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
    const windowSeconds = NotificationConfig.rateLimit.windowSeconds;

    // IN_APP: Higher limit for real-time notifications
    limits.set(NotificationChannel.IN_APP, {
      limit: NotificationConfig.rateLimit.inApp,
      windowSeconds,
    });

    // EMAIL: Moderate limit
    limits.set(NotificationChannel.EMAIL, {
      limit: NotificationConfig.rateLimit.email,
      windowSeconds,
    });

    // SMS: Lower limit (costs more)
    limits.set(NotificationChannel.SMS, {
      limit: NotificationConfig.rateLimit.sms,
      windowSeconds,
    });

    // WHATSAPP: Moderate limit
    limits.set(NotificationChannel.WHATSAPP, {
      limit: NotificationConfig.rateLimit.whatsapp,
      windowSeconds,
    });

    // PUSH: Higher limit (no direct cost)
    limits.set(NotificationChannel.PUSH, {
      limit: NotificationConfig.rateLimit.push,
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

    const result = await this.rateLimitService.checkLimit(
      key,
      config.limit,
      config.windowSeconds,
      {
        context: 'notification',
        identifier: userId,
      },
    );

    return result.allowed;
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
