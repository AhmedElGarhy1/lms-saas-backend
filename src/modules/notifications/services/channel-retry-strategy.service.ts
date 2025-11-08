import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationConfig } from '../config/notification.config';

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

  constructor() {
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
      maxAttempts: NotificationConfig.retry.email.maxAttempts,
      backoffType: NotificationConfig.retry.email.backoffType,
      backoffDelay: NotificationConfig.retry.email.backoffDelay,
    });

    // SMS: Fewer retries (costs more, 2 attempts)
    configs.set(NotificationChannel.SMS, {
      maxAttempts: NotificationConfig.retry.sms.maxAttempts,
      backoffType: NotificationConfig.retry.sms.backoffType,
      backoffDelay: NotificationConfig.retry.sms.backoffDelay,
    });

    // WHATSAPP: Moderate retries (2-3 attempts depending on provider)
    configs.set(NotificationChannel.WHATSAPP, {
      maxAttempts: NotificationConfig.retry.whatsapp.maxAttempts,
      backoffType: NotificationConfig.retry.whatsapp.backoffType,
      backoffDelay: NotificationConfig.retry.whatsapp.backoffDelay,
    });

    // PUSH: More retries (no direct cost, 4 attempts)
    configs.set(NotificationChannel.PUSH, {
      maxAttempts: NotificationConfig.retry.push.maxAttempts,
      backoffType: NotificationConfig.retry.push.backoffType,
      backoffDelay: NotificationConfig.retry.push.backoffDelay,
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
