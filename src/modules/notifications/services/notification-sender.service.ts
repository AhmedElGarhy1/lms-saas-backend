import { Injectable } from '@nestjs/common';
import {
  EmailAdapter,
  SmsAdapter,
  WhatsAppAdapter,
  PushAdapter,
  InAppAdapter,
} from '../adapters';
import { NotificationAdapter } from '../adapters/interfaces/notification-adapter.interface';
import { NotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { NotificationLog } from '../entities/notification-log.entity';
import { NotificationStatus } from '../enums/notification-status.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationMetricsService } from './notification-metrics.service';
import pLimit from 'p-limit';
import { ConfigService } from '@nestjs/config';

interface ChannelResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

@Injectable()
export class NotificationSenderService {
  private adapterRegistry: Map<NotificationChannel, NotificationAdapter>;
  private readonly sendMultipleConcurrency: number;

  constructor(
    private readonly emailAdapter: EmailAdapter,
    private readonly smsAdapter: SmsAdapter,
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly pushAdapter: PushAdapter,
    private readonly inAppAdapter: InAppAdapter,
    private readonly templateService: NotificationTemplateService,
    private readonly logRepository: NotificationLogRepository,
    private readonly logger: LoggerService,
    private readonly metricsService: NotificationMetricsService,
    private readonly configService: ConfigService,
  ) {
    // Initialize adapter registry
    this.adapterRegistry = new Map([
      [NotificationChannel.EMAIL, emailAdapter],
      [NotificationChannel.SMS, smsAdapter],
      [NotificationChannel.WHATSAPP, whatsappAdapter],
      [NotificationChannel.PUSH, pushAdapter],
      [NotificationChannel.IN_APP, inAppAdapter],
    ]);

    // Get concurrency limit from config (default: 5)
    this.sendMultipleConcurrency =
      parseInt(
        this.configService.get<string>(
          'NOTIFICATION_SEND_MULTIPLE_CONCURRENCY',
          '5',
        ),
        10,
      ) || 5;
  }

  /**
   * Send notification with graceful fallback
   * If one channel fails, continue with other channels
   */
  async send(payload: NotificationPayload): Promise<ChannelResult[]> {
    const results: ChannelResult[] = [];
    const adapter = this.adapterRegistry.get(payload.channel);

    if (!adapter) {
      const error = `No adapter found for channel: ${payload.channel}`;
      this.logger.error(error, undefined, 'NotificationSenderService', {
        channel: payload.channel,
        correlationId: payload.correlationId,
      });
      results.push({
        channel: payload.channel,
        success: false,
        error,
      });
      return results;
    }

    // For IN_APP channel, skip NotificationLog creation (uses Notification entity)
    if (payload.channel === NotificationChannel.IN_APP) {
      const startTime = Date.now();
      try {
        // IN_APP adapter handles persistence and WebSocket emission
        await adapter.send(payload);
        const latency = Date.now() - startTime;
        await this.metricsService.incrementSent(payload.channel, payload.type);
        await this.metricsService.recordLatency(payload.channel, latency);
        results.push({
          channel: payload.channel,
          success: true,
        });
        return results;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.metricsService.incrementFailed(
          payload.channel,
          payload.type,
        );
        this.logger.error(
          `Failed to send in-app notification: ${payload.type}`,
          error instanceof Error ? error.stack : undefined,
          'NotificationSenderService',
          {
            channel: payload.channel,
            type: payload.type,
            userId: payload.userId,
            correlationId: payload.correlationId,
          },
        );
        results.push({
          channel: payload.channel,
          success: false,
          error: errorMessage,
        });
        return results;
      }
    }

    // For other channels, create NotificationLog entry
    let notificationLog: NotificationLog | null = null;
    const startTime = Date.now();

    try {
      // Load and render template
      const locale = payload.locale || 'en';
      const dataObj = payload.data as Record<string, unknown>;
      const templateName =
        (typeof dataObj.template === 'string' ? dataObj.template : undefined) ||
        'default';
      const renderedContent = await this.templateService.renderTemplate(
        templateName,
        payload.data,
        locale,
      );

      // Create log entry
      notificationLog = await this.logRepository.create({
        type: payload.type,
        channel: payload.channel,
        status: NotificationStatus.PENDING,
        recipient: payload.recipient,
        metadata: payload.data,
        userId: payload.userId,
        centerId: payload.centerId,
        profileType: payload.profileType,
        profileId: payload.profileId,
        retryCount: 0,
        lastAttemptAt: new Date(),
      });

      // Prepare payload with rendered content
      const sendPayload: NotificationPayload = {
        ...payload,
        data: {
          ...dataObj,
          html: renderedContent,
          content: renderedContent,
        },
        subject:
          payload.subject ||
          (typeof dataObj.subject === 'string' ? dataObj.subject : undefined),
      };

      // Send notification
      await adapter.send(sendPayload);
      const latency = Date.now() - startTime;

      // Update log as success
      if (notificationLog) {
        await this.logRepository.update(notificationLog.id, {
          status: NotificationStatus.SENT,
          lastAttemptAt: new Date(),
        });
      }

      // Track metrics
      await this.metricsService.incrementSent(payload.channel, payload.type);
      await this.metricsService.recordLatency(payload.channel, latency);

      results.push({
        channel: payload.channel,
        success: true,
      });

      this.logger.debug(
        `Notification sent successfully: ${payload.type} via ${payload.channel} to ${payload.recipient}`,
        'NotificationSenderService',
        {
          channel: payload.channel,
          type: payload.type,
          recipient: payload.recipient,
          userId: payload.userId,
          correlationId: payload.correlationId,
        },
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Update log as failed
      if (notificationLog) {
        await this.logRepository.update(notificationLog.id, {
          status: NotificationStatus.FAILED,
          error: errorMessage,
          lastAttemptAt: new Date(),
        });
      }

      // Track metrics
      await this.metricsService.incrementFailed(payload.channel, payload.type);

      this.logger.error(
        `Failed to send notification: ${payload.type} via ${payload.channel}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationSenderService',
        {
          channel: payload.channel,
          type: payload.type,
          recipient: payload.recipient,
          userId: payload.userId,
          correlationId: payload.correlationId,
        },
      );

      results.push({
        channel: payload.channel,
        success: false,
        error: errorMessage,
      });
    }

    return results;
  }

  /**
   * Send multiple notifications (one per channel) with graceful fallback
   * Uses concurrency control to process multiple notifications in parallel
   * while limiting concurrent operations to prevent resource exhaustion
   */
  async sendMultiple(
    payloads: NotificationPayload[],
  ): Promise<ChannelResult[]> {
    if (payloads.length === 0) {
      return [];
    }

    // Create concurrency limiter
    const limit = pLimit(this.sendMultipleConcurrency);

    // Process all payloads in parallel with concurrency control
    const results = await Promise.all(
      payloads.map((payload) =>
        limit(async () => {
          try {
            return await this.send(payload);
          } catch (error: unknown) {
            // Individual send failures are already handled in send()
            // But if send() itself throws, catch it here
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              `Unexpected error in sendMultiple for channel ${payload.channel}`,
              error instanceof Error ? error.stack : undefined,
              'NotificationSenderService',
              {
                channel: payload.channel,
                type: payload.type,
                userId: payload.userId,
                correlationId: payload.correlationId,
              },
            );
            return [
              {
                channel: payload.channel,
                success: false,
                error: errorMessage,
              },
            ];
          }
        }),
      ),
    );

    // Flatten results array
    return results.flat();
  }
}
