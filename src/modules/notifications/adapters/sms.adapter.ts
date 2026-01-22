import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { SmsNotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { TimeoutConfigService } from '../config/timeout.config';
import * as twilio from 'twilio';
import pTimeout from 'p-timeout';
import { Config } from '@/shared/config/config';
import { NotificationErrors } from '../exceptions/notification-errors';

@Injectable()
export class SmsAdapter
  implements NotificationAdapter<SmsNotificationPayload>, OnModuleInit
{
  private twilioClient: twilio.Twilio | null = null;
  private readonly fromNumber: string | null;
  private readonly logger: Logger = new Logger(SmsAdapter.name);

  constructor(
    private readonly metricsService: NotificationMetricsService,
    private readonly timeoutConfig: TimeoutConfigService,
  ) {
    this.fromNumber = Config.twilio.phoneNumber || null;
  }

  onModuleInit() {
    this.initializeTwilio();
    this.validateConfiguration();
  }

  private initializeTwilio(): void {
    const accountSid = Config.twilio.accountSid;
    const authToken = Config.twilio.authToken;

    if (
      accountSid &&
      authToken &&
      accountSid.trim() !== '' &&
      authToken.trim() !== ''
    ) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
      } catch (error) {
        this.logger.error(
          'Failed to initialize Twilio SMS client',
          error instanceof Error ? error.stack : String(error),
        );
      }
    } else {
      this.logger.warn(
        'Twilio credentials not configured. SMS adapter will log messages only.',
      );
    }
  }

  /**
   * Validate configuration in production/staging environments
   */
  private validateConfiguration(): void {
    const nodeEnv = Config.app.nodeEnv;
    const isProduction = nodeEnv === 'production';

    if (isProduction && !this.isConfigured()) {
      this.logger.error(
        'CRITICAL: Twilio SMS is not configured in production/staging environment. Notifications will fail silently.',
      );
      // Don't throw - allow app to start, but log critical error
    }
  }

  private isConfigured(): boolean {
    return (
      this.twilioClient !== null &&
      this.fromNumber !== null &&
      this.fromNumber.trim() !== ''
    );
  }

  async send(payload: SmsNotificationPayload): Promise<void> {
    // Type system ensures channel is SMS, no runtime check needed
    const phoneNumber = payload.recipient;
    const message = payload.data.content || payload.data.message || '';

    if (!message) {
      throw NotificationErrors.missingNotificationContent(
        NotificationChannel.SMS,
        'content',
      );
    }

    // If Twilio is not configured, return (don't throw)
    if (!this.isConfigured()) {
      // Track as failed metric (no provider configured)
      await this.metricsService.incrementFailed(
        NotificationChannel.SMS,
        payload.type,
      );
      return;
    }

    const startTime = Date.now();
    try {
      // Wrap Twilio API call with timeout guard
      const timeoutMs = this.timeoutConfig.getTimeout(NotificationChannel.SMS);
      await pTimeout(
        this.twilioClient!.messages.create({
          body: message,
          from: this.fromNumber!,
          to: phoneNumber,
        }),
        {
          milliseconds: timeoutMs,
          message: `SMS send timeout after ${timeoutMs}ms`,
        },
      );

      const latency = Date.now() - startTime;

      // Track success metrics
      await this.metricsService.incrementSent(
        NotificationChannel.SMS,
        payload.type,
      );
      await this.metricsService.recordLatency(NotificationChannel.SMS, latency);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Track failure metric (must succeed even if send fails)
      await this.metricsService.incrementFailed(
        NotificationChannel.SMS,
        payload.type,
      );

      // Re-throw error - global handler will log it
      throw NotificationErrors.notificationSendingFailed(
        NotificationChannel.SMS,
        errorMessage,
      );
    }
  }
}
