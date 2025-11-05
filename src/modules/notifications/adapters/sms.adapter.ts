import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { SmsNotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import * as twilio from 'twilio';
import {
  MissingNotificationContentException,
  NotificationSendingFailedException,
} from '../exceptions/notification.exceptions';

@Injectable()
export class SmsAdapter implements NotificationAdapter<SmsNotificationPayload>, OnModuleInit {
  private twilioClient: twilio.Twilio | null = null;
  private readonly fromNumber: string | null;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly metricsService: NotificationMetricsService,
  ) {
    this.fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER') || null;
  }

  onModuleInit() {
    this.initializeTwilio();
    this.validateConfiguration();
  }

  private initializeTwilio(): void {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');

    if (
      accountSid &&
      authToken &&
      accountSid.trim() !== '' &&
      authToken.trim() !== ''
    ) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.logger.debug(
          'Twilio SMS client initialized successfully',
          'SmsAdapter',
        );
      } catch (error) {
        this.logger.error(
          'Failed to initialize Twilio SMS client',
          error instanceof Error ? error.stack : undefined,
        );
      }
    } else {
      this.logger.warn(
        'Twilio credentials not configured. SMS adapter will log messages only.',
        'SmsAdapter',
      );
    }
  }

  /**
   * Validate configuration in production/staging environments
   */
  private validateConfiguration(): void {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production' || nodeEnv === 'staging';

    if (isProduction && !this.isConfigured()) {
      this.logger.error(
        'CRITICAL: Twilio SMS is not configured in production/staging environment. Notifications will fail silently.',
        undefined,
        'SmsAdapter',
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
    const message =
      payload.data.content || payload.data.html || payload.data.message || '';

    if (!message) {
      throw new MissingNotificationContentException(
        NotificationChannel.SMS,
        'content',
      );
    }

    // If Twilio is not configured, log and return (don't throw)
    if (!this.isConfigured()) {
      this.logger.log(
        `SMS would be sent to ${phoneNumber}: ${message.substring(0, 100)}...`,
        'SmsAdapter',
        {
          channel: NotificationChannel.SMS,
          type: payload.type,
          recipient: phoneNumber,
          status: 'failed',
          messageLength: message.length,
        },
      );
      // Track as failed metric (no provider configured)
      await this.metricsService.incrementFailed(
        NotificationChannel.SMS,
        payload.type,
      );
      return;
    }

    const startTime = Date.now();
    try {
      await this.twilioClient!.messages.create({
        body: message,
        from: this.fromNumber!,
        to: phoneNumber,
      });

      const latency = Date.now() - startTime;

      // Track success metrics
      await this.metricsService.incrementSent(
        NotificationChannel.SMS,
        payload.type,
      );
      await this.metricsService.recordLatency(NotificationChannel.SMS, latency);

      this.logger.debug(`SMS sent successfully (${latency}ms)`, 'SmsAdapter', {
        channel: NotificationChannel.SMS,
        type: payload.type,
        recipient: phoneNumber,
        status: 'sent',
        latency,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Track failure metric (must succeed even if send fails)
      await this.metricsService.incrementFailed(
        NotificationChannel.SMS,
        payload.type,
      );

      // Re-throw error - global handler will log it
      throw new NotificationSendingFailedException(
        NotificationChannel.SMS,
        errorMessage,
        payload.userId,
      );
    }
  }
}
