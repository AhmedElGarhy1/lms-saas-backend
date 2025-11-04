import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { NotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { WhatsAppProvider } from './providers/whatsapp-provider.interface';
import { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';
import { MetaWhatsAppProvider } from './providers/meta-whatsapp.provider';

@Injectable()
export class WhatsAppAdapter implements NotificationAdapter, OnModuleInit {
  private provider: WhatsAppProvider | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly metricsService: NotificationMetricsService,
    private readonly twilioProvider: TwilioWhatsAppProvider,
    private readonly metaProvider: MetaWhatsAppProvider,
  ) {}

  onModuleInit() {
    this.initializeProvider();
    this.validateConfiguration();
  }

  private initializeProvider(): void {
    // Prefer Meta Business API if configured
    if (this.metaProvider.isConfigured()) {
      this.provider = this.metaProvider;
      this.logger.debug(
        'Using WhatsApp Business API (Meta) provider',
        'WhatsAppAdapter',
      );
      return;
    }

    // Fallback to Twilio if configured
    if (this.twilioProvider.isConfigured()) {
      this.provider = this.twilioProvider;
      this.logger.debug('Using Twilio WhatsApp provider', 'WhatsAppAdapter');
      return;
    }

    // No provider configured
    this.provider = null;
    this.logger.warn(
      'No WhatsApp provider configured. WhatsApp adapter will log messages only.',
      'WhatsAppAdapter',
    );
  }

  /**
   * Validate configuration in production/staging environments
   */
  private validateConfiguration(): void {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production' || nodeEnv === 'staging';

    if (isProduction && !this.provider) {
      this.logger.error(
        'CRITICAL: WhatsApp provider is not configured in production/staging environment. Notifications will fail silently.',
        undefined,
        'WhatsAppAdapter',
      );
      // Don't throw - allow app to start, but log critical error
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (payload.channel !== NotificationChannel.WHATSAPP) {
      throw new Error('WhatsAppAdapter can only send WHATSAPP notifications');
    }

    const phoneNumber = payload.recipient;
    const message =
      payload.data.content || payload.data.html || payload.data.message || '';

    if (!message) {
      throw new Error('WhatsApp message content is required');
    }

    // If no provider is configured, log and return (don't throw)
    if (!this.provider) {
      this.logger.log(
        `WhatsApp message would be sent to ${phoneNumber}: ${message.substring(0, 100)}...`,
        'WhatsAppAdapter',
        {
          channel: NotificationChannel.WHATSAPP,
          type: payload.type,
          recipient: phoneNumber,
          status: 'failed',
          messageLength: message.length,
        },
      );
      // Track as failed metric (no provider configured)
      await this.metricsService.incrementFailed(
        NotificationChannel.WHATSAPP,
        payload.type,
      );
      return;
    }

    const startTime = Date.now();
    try {
      await this.provider.sendMessage(phoneNumber, message);
      const latency = Date.now() - startTime;

      // Track metrics
      await this.metricsService.incrementSent(
        NotificationChannel.WHATSAPP,
        payload.type,
      );
      await this.metricsService.recordLatency(
        NotificationChannel.WHATSAPP,
        latency,
      );

      this.logger.debug(
        `WhatsApp message sent successfully via ${this.provider.getProviderName()} (${latency}ms)`,
        'WhatsAppAdapter',
        {
          channel: NotificationChannel.WHATSAPP,
          type: payload.type,
          recipient: phoneNumber,
          status: 'sent',
          provider: this.provider.getProviderName(),
          latency,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const latency = Date.now() - startTime;

      // Track failure metric
      await this.metricsService.incrementFailed(
        NotificationChannel.WHATSAPP,
        payload.type,
      );

      this.logger.error(
        `Failed to send WhatsApp message via ${this.provider.getProviderName()} (${latency}ms): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'WhatsAppAdapter',
        {
          channel: NotificationChannel.WHATSAPP,
          type: payload.type,
          recipient: phoneNumber,
          status: 'failed',
          provider: this.provider.getProviderName(),
          error: errorMessage,
          latency,
        },
      );
      throw new Error(`Failed to send WhatsApp message: ${errorMessage}`);
    }
  }
}
