import { Injectable } from '@nestjs/common';
import {
  EmailAdapter,
  SmsAdapter,
  WhatsAppAdapter,
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
import { Config } from '@/shared/config/config';
import { RequestContext } from '@/shared/common/context/request.context';
import { NotificationIdempotencyCacheService } from './notification-idempotency-cache.service';
import {
  NotificationCircuitBreakerService,
  CircuitState,
} from './notification-circuit-breaker.service';

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
    private readonly inAppAdapter: InAppAdapter,
    private readonly templateService: NotificationTemplateService,
    private readonly logRepository: NotificationLogRepository,
    private readonly logger: LoggerService,
    private readonly metricsService: NotificationMetricsService,
    private readonly idempotencyCache?: NotificationIdempotencyCacheService,
    private readonly circuitBreaker?: NotificationCircuitBreakerService,
  ) {
    // Initialize adapter registry
    // Note: PUSH adapter removed - not yet implemented
    this.adapterRegistry = new Map<NotificationChannel, NotificationAdapter>([
      [NotificationChannel.EMAIL, emailAdapter],
      [NotificationChannel.SMS, smsAdapter],
      [NotificationChannel.WHATSAPP, whatsappAdapter],
      [NotificationChannel.IN_APP, inAppAdapter],
    ]);

    // Get concurrency limit from config
    this.sendMultipleConcurrency = Config.notification.sendMultipleConcurrency;
  }

  /**
   * Get correlationId from RequestContext with fallback to payload
   */
  private getCorrelationId(payload: NotificationPayload): string | undefined {
    return (
      RequestContext.get()?.correlationId ||
      RequestContext.get()?.requestId ||
      payload.correlationId
    );
  }

  /**
   * Send notification with graceful fallback
   * If one channel fails, continue with other channels
   */
  async send(payload: NotificationPayload): Promise<ChannelResult[]> {
    const results: ChannelResult[] = [];
    const adapter = this.adapterRegistry.get(payload.channel);
    const correlationId = this.getCorrelationId(payload);

    if (!adapter) {
      const error = `No adapter found for channel: ${payload.channel}`;
      this.logger.error(error, undefined, 'NotificationSenderService', {
        channel: payload.channel,
        correlationId,
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
        // Use circuit breaker for IN_APP as well
        await (this.circuitBreaker
          ? this.circuitBreaker.executeWithCircuitBreaker(
              payload.channel,
              async () => {
                await adapter.send(payload);
              },
            )
          : adapter.send(payload)); // Fallback if circuit breaker not available
        const latency = Date.now() - startTime;
        await this.metricsService.incrementSent(payload.channel, payload.type);
        await this.metricsService.recordLatency(payload.channel, latency);

        // Mark as sent in idempotency cache (if service is available)
        if (this.idempotencyCache && correlationId) {
          await this.idempotencyCache.markSent(
            correlationId,
            payload.type,
            payload.channel,
            payload.recipient || payload.userId || 'unknown',
          );
        }

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
        const jobId = (payload.data as Record<string, unknown>)?.jobId as
          | string
          | undefined;
        this.logger.error(
          `Failed to send in-app notification: ${payload.type}`,
          error instanceof Error ? error.stack : undefined,
          'NotificationSenderService',
          {
            channel: payload.channel,
            type: payload.type,
            userId: payload.userId,
            correlationId,
            jobId,
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
      // All notifications now come pre-rendered from the manifest system
      const dataObj = payload.data as Record<string, unknown>;
      const renderedContent = dataObj.content as string;

      if (!renderedContent || typeof renderedContent !== 'string') {
        const errorMessage = `Missing pre-rendered content for ${payload.type}:${payload.channel}. Manifest system should provide rendered content.`;
        this.logger.error(
          errorMessage,
          undefined,
          'NotificationSenderService',
          {
            channel: payload.channel,
            type: payload.type,
            userId: payload.userId,
            correlationId,
          },
        );
        results.push({
          channel: payload.channel,
          success: false,
          error: errorMessage,
        });
        return results;
      }

      // Extract jobId from payload data if available (for retries)
      const jobId = dataObj.jobId as string | undefined;

      // Try to find existing log entry for this job (for retries)
      if (jobId && payload.userId) {
        const existingLogs = await this.logRepository.findMany({
          where: {
            jobId: jobId,
            userId: payload.userId,
            type: payload.type,
            channel: payload.channel,
          },
          order: { createdAt: 'DESC' },
          take: 1,
        });

        if (existingLogs.length > 0) {
          notificationLog = existingLogs[0];
          // Update existing log for retry
          const currentRetryCount = (notificationLog.retryCount || 0) + 1;
          await this.logRepository.update(notificationLog.id, {
            status: NotificationStatus.RETRYING,
            retryCount: currentRetryCount,
            lastAttemptAt: new Date(),
            // Clear previous error by omitting it (will remain as is if not set)
          });
        }
      }

      // Create new log entry only if we didn't find an existing one
      if (!notificationLog) {
        notificationLog = await this.logRepository.create({
          type: payload.type,
          channel: payload.channel,
          status: NotificationStatus.PENDING,
          recipient: payload.recipient,
          metadata: {
            ...payload.data,
            jobId: jobId,
            correlationId,
          },
          userId: payload.userId,
          centerId: payload.centerId,
          profileType: payload.profileType,
          profileId: payload.profileId,
          jobId: jobId, // Store jobId directly
          retryCount: 0,
          lastAttemptAt: new Date(),
        });
      }

      // Prepare payload with rendered content
      // Build channel-specific payload based on channel type
      // Extract common fields and channel first since payload is a union type
      const channel = payload.channel;
      const commonFields = {
        type: payload.type,
        group: payload.group,
        locale: payload.locale,
        centerId: payload.centerId,
        userId: payload.userId,
        profileType: payload.profileType,
        profileId: payload.profileId,
        correlationId: payload.correlationId,
      };

      let sendPayload: NotificationPayload;

      if (channel === NotificationChannel.EMAIL) {
        sendPayload = {
          ...commonFields,
          channel: NotificationChannel.EMAIL,
          recipient: payload.recipient,
          subject:
            (payload as any).subject ||
            (typeof dataObj.subject === 'string'
              ? dataObj.subject
              : 'Notification'),
          data: {
            html: renderedContent,
            content: renderedContent,
            ...dataObj,
          },
        } as NotificationPayload;
      } else if (
        channel === NotificationChannel.SMS ||
        channel === NotificationChannel.WHATSAPP
      ) {
        sendPayload = {
          ...commonFields,
          channel: channel,
          recipient: payload.recipient,
          data: {
            content: renderedContent,
            message: renderedContent,
            html: renderedContent,
            ...dataObj,
          },
        } as NotificationPayload;
      } else if (channel === NotificationChannel.PUSH) {
        sendPayload = {
          ...commonFields,
          channel: NotificationChannel.PUSH,
          recipient: payload.recipient,
          title: (payload as any).title || 'Notification',
          data: {
            message: renderedContent,
            ...dataObj,
          },
        } as NotificationPayload;
      } else {
        // This should not happen for known channels, but handle gracefully
        // IN_APP is handled at the top of the method, so this is a fallback
        sendPayload = {
          ...commonFields,
          channel: channel,
          recipient: (payload as any).recipient || '',
          data: {
            ...dataObj,
            html: renderedContent,
            content: renderedContent,
          },
        } as unknown as NotificationPayload;
      }

      // Send notification with circuit breaker protection
      await (this.circuitBreaker
        ? this.circuitBreaker.executeWithCircuitBreaker(
            payload.channel,
            async () => {
              await adapter.send(sendPayload);
            },
          )
        : adapter.send(sendPayload)); // Fallback if circuit breaker not available
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

      // Mark as sent in idempotency cache (if service is available)
      if (this.idempotencyCache && correlationId) {
        await this.idempotencyCache.markSent(
          correlationId,
          payload.type,
          payload.channel,
          payload.recipient,
        );
      }

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
          jobId: (payload.data as Record<string, unknown>)?.jobId as
            | string
            | undefined,
          error: errorMessage,
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
            const correlationId = this.getCorrelationId(payload);
            this.logger.error(
              `Unexpected error in sendMultiple for channel ${payload.channel}`,
              error instanceof Error ? error.stack : undefined,
              'NotificationSenderService',
              {
                channel: payload.channel,
                type: payload.type,
                userId: payload.userId,
                correlationId,
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
