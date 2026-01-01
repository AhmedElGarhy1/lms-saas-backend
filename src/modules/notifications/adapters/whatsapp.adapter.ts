import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { WhatsAppNotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { TimeoutConfigService } from '../config/timeout.config';
import {
  WhatsAppProvider,
  WhatsAppTemplateMessage,
} from './providers/whatsapp-provider.interface';
import { MetaWhatsAppProvider } from './providers/meta-whatsapp.provider';
import pTimeout from 'p-timeout';
import { Config } from '@/shared/config/config';
import {
  MissingNotificationContentException,
  NotificationSendingFailedException,
} from '../exceptions/notification.exceptions';

@Injectable()
export class WhatsAppAdapter
  implements NotificationAdapter<WhatsAppNotificationPayload>, OnModuleInit
{
  private provider: WhatsAppProvider | null = null;
  private readonly logger: Logger = new Logger(WhatsAppAdapter.name);

  constructor(
    private readonly metricsService: NotificationMetricsService,
    private readonly timeoutConfig: TimeoutConfigService,
    private readonly metaProvider: MetaWhatsAppProvider,
  ) {}

  onModuleInit() {
    this.initializeProvider();
    this.validateConfiguration();
  }

  private initializeProvider(): void {
    if (this.metaProvider.isConfigured()) {
      this.provider = this.metaProvider;
      return;
    }

    // No provider configured
    this.provider = null;
    this.logger.warn(
      'No WhatsApp provider configured. WhatsApp adapter will log messages only.',
    );
  }

  /**
   * Validate configuration in production/staging environments
   */
  private validateConfiguration(): void {
    const nodeEnv = Config.app.nodeEnv;
    const isProduction = nodeEnv === 'production';

    if (isProduction && !this.provider) {
      this.logger.error(
        'CRITICAL: WhatsApp provider is not configured in production/staging environment. Notifications will fail silently.',
      );
      // Don't throw - allow app to start, but log critical error
    }
  }

  async send(payload: WhatsAppNotificationPayload): Promise<void> {
    // Type system ensures channel is WHATSAPP, no runtime check needed
    const phoneNumber = payload.recipient;
    const { templateName, templateLanguage, templateParameters } = payload.data;

    // Validate template structure
    if (!templateName || !templateLanguage || !templateParameters) {
      throw new MissingNotificationContentException(
        NotificationChannel.WHATSAPP,
        'templateName, templateLanguage, or templateParameters',
      );
    }

    // If no provider is configured, return (don't throw)
    if (!this.provider) {
      // Track as failed metric (no provider configured)
      await this.metricsService.incrementFailed(
        NotificationChannel.WHATSAPP,
        payload.type,
      );
      return;
    }

    const startTime = Date.now();
    try {
      // Build template message structure
      const templateMessage: WhatsAppTemplateMessage = {
        templateName,
        templateLanguage,
        templateParameters,
      };

      // Wrap provider API call with timeout guard
      const timeoutMs = this.timeoutConfig.getTimeout(
        NotificationChannel.WHATSAPP,
      );
      const result = await pTimeout(
        this.provider.sendMessage(phoneNumber, templateMessage),
        {
          milliseconds: timeoutMs,
          message: `WhatsApp send timeout after ${timeoutMs}ms`,
        },
      );
      const latency = Date.now() - startTime;

      // Store message ID in result (will be used by notification sender service)
      // The message ID will be stored in notification log metadata by the sender service
      payload.whatsappMessageId = result.messageId;

      // Track metrics
      await this.metricsService.incrementSent(
        NotificationChannel.WHATSAPP,
        payload.type,
      );
      await this.metricsService.recordLatency(
        NotificationChannel.WHATSAPP,
        latency,
      );

      // Debug log removed - routine operation
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Track failure metric (must succeed even if send fails)
      await this.metricsService.incrementFailed(
        NotificationChannel.WHATSAPP,
        payload.type,
      );

      // Re-throw error - global handler will log it
      throw new NotificationSendingFailedException(
        NotificationChannel.WHATSAPP,
        errorMessage,
      );
    }
  }
}
