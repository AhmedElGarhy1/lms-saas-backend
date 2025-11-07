import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/shared/services/logger.service';
import { Config } from '@/shared/config/config';

/**
 * Service for sending alerts about notification system health
 * Supports multiple alert channels (email, Slack, etc.)
 */
@Injectable()
export class NotificationAlertService {
  private readonly enabled: boolean;
  private readonly alertThrottleMinutes: number;
  private readonly lastAlertTime = new Map<string, number>();

  constructor(private readonly logger: LoggerService) {
    this.enabled = Config.notification.alerts.enabled;
    this.alertThrottleMinutes = Config.notification.alerts.throttleMinutes;
  }

  /**
   * Send alert with throttling to prevent spam
   * @param level - Alert level (warning, critical)
   * @param message - Alert message
   * @param context - Additional context
   */
  async sendAlert(
    level: 'warning' | 'critical',
    message: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Create alert key for throttling
    const alertKey = `${level}:${message}`;
    const now = Date.now();
    const lastSent = this.lastAlertTime.get(alertKey) || 0;
    const throttleMs = this.alertThrottleMinutes * 60 * 1000;

    // Check if alert was sent recently
    if (now - lastSent < throttleMs) {
      this.logger.debug(
        `Alert throttled: ${message} (last sent ${Math.round((now - lastSent) / 1000 / 60)} minutes ago)`,
        'NotificationAlertService',
        { level, message, context },
      );
      return;
    }

    // Update last sent time
    this.lastAlertTime.set(alertKey, now);

    // Log alert (in production, this could send to email/Slack/etc.)
    if (level === 'critical') {
      this.logger.error(
        `🚨 CRITICAL ALERT: ${message}`,
        undefined,
        'NotificationAlertService',
        {
          level,
          message,
          ...context,
        },
      );
    } else {
      this.logger.warn(`⚠️ WARNING: ${message}`, 'NotificationAlertService', {
        level,
        message,
        ...context,
      });
    }

    // TODO: In future, integrate with external alerting services:
    // - Email alerts
    // - Slack webhooks
    // - PagerDuty
    // - etc.
  }

  /**
   * Clear alert throttling (for testing or manual reset)
   */
  clearThrottle(alertKey?: string): void {
    if (alertKey) {
      this.lastAlertTime.delete(alertKey);
    } else {
      this.lastAlertTime.clear();
    }
  }
}
