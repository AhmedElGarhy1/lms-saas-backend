import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationConfig } from './notification.config';

/**
 * Configuration service for provider-specific timeout values
 * Ensures timeouts are appropriate for each provider's SLA
 */
@Injectable()
export class TimeoutConfigService {
  private readonly timeouts: Map<NotificationChannel, number>;

  constructor() {
    this.timeouts = new Map([
      [NotificationChannel.SMS, NotificationConfig.timeouts.sms],
      [NotificationChannel.EMAIL, NotificationConfig.timeouts.email],
      [NotificationChannel.WHATSAPP, NotificationConfig.timeouts.whatsapp],
      [NotificationChannel.PUSH, NotificationConfig.timeouts.push],
      [NotificationChannel.IN_APP, NotificationConfig.timeouts.inApp],
    ]);
  }

  /**
   * Get timeout value for a channel in milliseconds
   */
  getTimeout(channel: NotificationChannel): number {
    return this.timeouts.get(channel) || 30000; // Default: 30s
  }

  /**
   * Get all timeout configurations (for monitoring/debugging)
   */
  getAllTimeouts(): Record<NotificationChannel, number> {
    const result: Record<string, number> = {};
    this.timeouts.forEach((timeout, channel) => {
      result[channel] = timeout;
    });
    return result as Record<NotificationChannel, number>;
  }
}
