import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../enums/notification-channel.enum';

export interface ChannelRetryConfig {
  maxAttempts: number;
  backoffType: 'exponential' | 'fixed';
  backoffDelay: number; // in milliseconds
}

/**
 * Service for managing channel-specific retry strategies
 * Provides different retry configurations for different notification channels
 */
@Injectable()
export class ChannelRetryStrategyService {
  private readonly channelRetryConfigs: Map<
    NotificationChannel,
    ChannelRetryConfig
  >;
  private readonly defaultRetryConfig: ChannelRetryConfig;

  constructor(private readonly configService: ConfigService) {
    // Default retry config (fallback)
    this.defaultRetryConfig = {
      maxAttempts: 3,
      backoffType: 'exponential',
      backoffDelay: 2000,
    };

    // Initialize channel-specific retry configs
    this.channelRetryConfigs = this.initializeChannelRetryConfigs();
  }

  /**
   * Initialize channel-specific retry configurations from environment variables
   */
  private initializeChannelRetryConfigs(): Map<
    NotificationChannel,
    ChannelRetryConfig
  > {
    const configs = new Map<NotificationChannel, ChannelRetryConfig>();

    // EMAIL: Standard retries (3 attempts, exponential backoff)
    configs.set(NotificationChannel.EMAIL, {
      maxAttempts:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RETRY_EMAIL_MAX_ATTEMPTS',
            '3',
          ),
          10,
        ) || 3,
      backoffType:
        (this.configService.get<string>(
          'NOTIFICATION_RETRY_EMAIL_BACKOFF_TYPE',
          'exponential',
        ) as 'exponential' | 'fixed') || 'exponential',
      backoffDelay:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RETRY_EMAIL_BACKOFF_DELAY',
            '2000',
          ),
          10,
        ) || 2000,
    });

    // SMS: Fewer retries (costs more, 2 attempts)
    configs.set(NotificationChannel.SMS, {
      maxAttempts:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RETRY_SMS_MAX_ATTEMPTS',
            '2',
          ),
          10,
        ) || 2,
      backoffType:
        (this.configService.get<string>(
          'NOTIFICATION_RETRY_SMS_BACKOFF_TYPE',
          'exponential',
        ) as 'exponential' | 'fixed') || 'exponential',
      backoffDelay:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RETRY_SMS_BACKOFF_DELAY',
            '3000',
          ),
          10,
        ) || 3000,
    });

    // WHATSAPP: Moderate retries (2-3 attempts depending on provider)
    configs.set(NotificationChannel.WHATSAPP, {
      maxAttempts:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RETRY_WHATSAPP_MAX_ATTEMPTS',
            '2',
          ),
          10,
        ) || 2,
      backoffType:
        (this.configService.get<string>(
          'NOTIFICATION_RETRY_WHATSAPP_BACKOFF_TYPE',
          'exponential',
        ) as 'exponential' | 'fixed') || 'exponential',
      backoffDelay:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RETRY_WHATSAPP_BACKOFF_DELAY',
            '3000',
          ),
          10,
        ) || 3000,
    });

    // PUSH: More retries (no direct cost, 4 attempts)
    configs.set(NotificationChannel.PUSH, {
      maxAttempts:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RETRY_PUSH_MAX_ATTEMPTS',
            '4',
          ),
          10,
        ) || 4,
      backoffType:
        (this.configService.get<string>(
          'NOTIFICATION_RETRY_PUSH_BACKOFF_TYPE',
          'exponential',
        ) as 'exponential' | 'fixed') || 'exponential',
      backoffDelay:
        parseInt(
          this.configService.get<string>(
            'NOTIFICATION_RETRY_PUSH_BACKOFF_DELAY',
            '2000',
          ),
          10,
        ) || 2000,
    });

    // IN_APP: No retries (handled separately, direct send)
    // This is for completeness but IN_APP bypasses queue
    configs.set(NotificationChannel.IN_APP, {
      maxAttempts: 1, // No retries for IN_APP (direct send)
      backoffType: 'fixed',
      backoffDelay: 0,
    });

    return configs;
  }

  /**
   * Get retry configuration for a specific channel
   * @param channel - Notification channel
   * @returns Retry configuration for the channel
   */
  getRetryConfig(channel: NotificationChannel): ChannelRetryConfig {
    return this.channelRetryConfigs.get(channel) || this.defaultRetryConfig;
  }

  /**
   * Get all channel retry configurations
   * @returns Map of channel to retry config
   */
  getAllRetryConfigs(): Map<NotificationChannel, ChannelRetryConfig> {
    return new Map(this.channelRetryConfigs);
  }
}
