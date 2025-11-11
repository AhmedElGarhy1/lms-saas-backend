import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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
import { NotificationMetricsService } from './notification-metrics.service';
import pLimit from 'p-limit';
import { NotificationConfig } from '../config/notification.config';
import { NotificationIdempotencyCacheService } from './notification-idempotency-cache.service';
import { NotificationCircuitBreakerService } from './notification-circuit-breaker.service';
import { isRecord, getStringProperty } from '../utils/type-guards.util';
import {
  EmailNotificationPayload,
  PushNotificationPayload,
} from '../types/notification-payload.interface';
import { buildStandardizedMetadata } from '../utils/metadata-builder.util';
import { RenderedNotification } from '../manifests/types/manifest.types';
import { BaseService } from '@/shared/common/services/base.service';
import { Logger } from '@nestjs/common';

/**
 * Type guard to check if payload is EmailNotificationPayload
 */
function isEmailPayload(
  payload: NotificationPayload,
): payload is EmailNotificationPayload {
  return payload.channel === NotificationChannel.EMAIL && 'subject' in payload;
}

/**
 * Type guard to check if payload is PushNotificationPayload
 */
function isPushPayload(
  payload: NotificationPayload,
): payload is PushNotificationPayload {
  return payload.channel === NotificationChannel.PUSH && 'title' in payload;
}

interface ChannelResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

/**
 * Service for sending notifications to various channels
 *
 * Error Handling Strategy: FAIL_CLOSED
 * - Notification sending failures are logged and tracked in notification_logs
 * - Failed notifications trigger retry mechanisms via BullMQ
 * - Metrics are updated to track failure rates
 * - Errors are propagated to allow retry logic to handle them
 *
 * @see ERROR_HANDLING_CONFIG for channel-specific error handling strategies
 */
@Injectable()
export class NotificationSenderService extends BaseService {
  private readonly logger: Logger;
  private adapterRegistry: Map<NotificationChannel, NotificationAdapter>;
  private readonly sendMultipleConcurrency: number;

  constructor(
    private readonly emailAdapter: EmailAdapter,
    private readonly smsAdapter: SmsAdapter,
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly inAppAdapter: InAppAdapter,
    private readonly templateService: NotificationTemplateService,
    private readonly logRepository: NotificationLogRepository,
    private readonly metricsService: NotificationMetricsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly idempotencyCache?: NotificationIdempotencyCacheService,
    private readonly circuitBreaker?: NotificationCircuitBreakerService,
  ) {
    super();
    const context = this.constructor.name;
    this.logger = new Logger(context);
    // Initialize adapter registry
    this.adapterRegistry = new Map<NotificationChannel, NotificationAdapter>([
      [NotificationChannel.EMAIL, emailAdapter],
      [NotificationChannel.SMS, smsAdapter],
      [NotificationChannel.WHATSAPP, whatsappAdapter],
      [NotificationChannel.IN_APP, inAppAdapter],
    ]);

    // Get concurrency limit from config
    this.sendMultipleConcurrency = NotificationConfig.sendMultipleConcurrency;
  }

  /**
   * Get correlationId from payload
   * No longer uses RequestContext to support background/queue contexts
   */
  private getCorrelationId(payload: NotificationPayload): string | undefined {
    return payload.correlationId;
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
      this.logger.error(
        `No adapter found for channel: ${payload.channel}, correlationId: ${correlationId}`,
      );
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
        const jobId = isRecord(payload.data)
          ? getStringProperty(payload.data, 'jobId')
          : undefined;
        this.logger.error(
          `Failed to send in-app notification: ${payload.type}`,
          error,
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

    // For other channels, use transaction to ensure atomicity
    // Create log, send notification, update log - all in one transaction
    return this.dataSource.transaction(async (manager) => {
      const logRepo = manager.getRepository(NotificationLog);
      let notificationLog: NotificationLog | null = null;
      const startTime = Date.now();

      // Declare variables outside try block for use in catch block
      let rendered: RenderedNotification | null = null;
      let jobId: string | undefined;
      let sendPayload: NotificationPayload | null = null;
      const correlationIdForMetadata = correlationId || '';

      try {
        // All notifications now come pre-rendered from the manifest system
        // Use type guard to safely access payload.data
        if (!isRecord(payload.data)) {
          const errorMessage = `Invalid payload data format for ${payload.type}:${payload.channel}. Expected object.`;
          this.logger.error(
            `${errorMessage} - channel: ${payload.channel}, type: ${payload.type}, userId: ${payload.userId}, correlationId: ${correlationId}`,
          );
          return [
            {
              channel: payload.channel,
              success: false,
              error: errorMessage,
            },
          ];
        }

        const dataObj = payload.data;
        const renderedContent = getStringProperty(dataObj, 'content');

        if (!renderedContent) {
          const errorMessage = `Missing pre-rendered content for ${payload.type}:${payload.channel}. Manifest system should provide rendered content.`;
          this.logger.error(
            `${errorMessage} - channel: ${payload.channel}, type: ${payload.type}, userId: ${payload.userId}, correlationId: ${correlationId}`,
          );
          return [
            {
              channel: payload.channel,
              success: false,
              error: errorMessage,
            },
          ];
        }

        // Extract jobId from payload data if available (for retries)
        jobId = getStringProperty(dataObj, 'jobId');

        // Try to find existing log entry for this job (for retries)
        if (jobId && payload.userId) {
          const existingLogs = await logRepo.find({
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
            await logRepo.update(notificationLog.id, {
              status: NotificationStatus.RETRYING,
              retryCount: currentRetryCount,
              lastAttemptAt: new Date(),
            });
          }
        }

        // Extract template path from payload data
        const templatePath = getStringProperty(dataObj, 'template') || '';

        // Create a minimal RenderedNotification object for metadata building
        rendered = {
          type: payload.type,
          channel: payload.channel,
          content: renderedContent,
          metadata: {
            template: templatePath,
            locale: payload.locale || 'en',
          },
        };

        // Create new log entry only if we didn't find an existing one
        // Use minimal metadata initially, will be updated after successful send
        if (!notificationLog && rendered) {
          notificationLog = await logRepo.save({
            type: payload.type,
            channel: payload.channel,
            status: NotificationStatus.PENDING,
            recipient: payload.recipient,
            metadata: buildStandardizedMetadata(payload, rendered, {
              jobId: jobId,
              correlationId: correlationIdForMetadata,
              retryCount: 0,
            }),
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

        // Declare sendPayload variable (already declared outside try block)

        if (channel === NotificationChannel.EMAIL) {
          const subject = isEmailPayload(payload)
            ? payload.subject
            : typeof dataObj.subject === 'string'
              ? dataObj.subject
              : 'Notification';
          sendPayload = {
            ...commonFields,
            channel: NotificationChannel.EMAIL,
            recipient: payload.recipient,
            subject,
            data: {
              html: renderedContent,
              content: renderedContent,
              ...dataObj,
            },
          } as EmailNotificationPayload;
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
          const title = isPushPayload(payload) ? payload.title : 'Notification';
          sendPayload = {
            ...commonFields,
            channel: NotificationChannel.PUSH,
            recipient: payload.recipient,
            title,
            data: {
              message: renderedContent,
              ...dataObj,
            },
          } as PushNotificationPayload;
        } else {
          // This should not happen for known channels, but handle gracefully
          // IN_APP is handled at the top of the method, so this is a fallback
          // For unknown channels, use recipient from payload
          // TypeScript narrows to 'never' here, so we need to check the property safely
          const payloadWithRecipient = payload as { recipient?: string };
          const fallbackRecipient = payloadWithRecipient.recipient || '';
          sendPayload = {
            ...commonFields,
            channel: channel,
            recipient: fallbackRecipient,
            data: {
              ...dataObj,
              html: renderedContent,
              content: renderedContent,
            },
            // Add required fields based on channel type
            ...(channel === NotificationChannel.EMAIL && {
              subject: 'Notification',
            }),
            ...(channel === NotificationChannel.PUSH && {
              title: 'Notification',
            }),
            ...(channel === NotificationChannel.IN_APP && {
              title: 'Notification',
            }),
          } as NotificationPayload;
        }

        // Send notification with circuit breaker protection
        if (!sendPayload) {
          throw new Error('Failed to build send payload');
        }
        // TypeScript now knows sendPayload is not null
        const finalPayload = sendPayload;
        await (this.circuitBreaker
          ? this.circuitBreaker.executeWithCircuitBreaker(
              payload.channel,
              async () => {
                await adapter.send(finalPayload);
              },
            )
          : adapter.send(finalPayload)); // Fallback if circuit breaker not available
        const latency = Date.now() - startTime;

        // Update log as success with standardized metadata (within transaction)
        if (notificationLog) {
          // Build standardized metadata with rendered content and performance metrics
          if (sendPayload && rendered) {
            const standardizedMetadata = buildStandardizedMetadata(
              sendPayload,
              rendered,
              {
                jobId: jobId,
                correlationId: correlationIdForMetadata,
                retryCount: notificationLog.retryCount || 0,
                latencyMs: latency,
                deliveredAt: new Date(),
              },
            );

            await logRepo.update(notificationLog.id, {
              status: NotificationStatus.SENT,
              metadata: standardizedMetadata,
              lastAttemptAt: new Date(),
            });
          } else {
            // Fallback if sendPayload or rendered not available
            await logRepo.update(notificationLog.id, {
              status: NotificationStatus.SENT,
              lastAttemptAt: new Date(),
            });
          }
        }
        // Track metrics (outside transaction - these are non-critical)
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

        return [
          {
            channel: payload.channel,
            success: true,
          },
        ];
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Update log as failed with standardized metadata (within transaction)
        if (notificationLog) {
          // Build standardized metadata even for failed sends (for consistency)
          // Use sendPayload if available (created before send), otherwise use original payload
          const payloadForMetadata = sendPayload || payload;
          if (rendered) {
            const standardizedMetadata = buildStandardizedMetadata(
              payloadForMetadata,
              rendered,
              {
                jobId: jobId,
                correlationId: correlationIdForMetadata,
                retryCount: notificationLog.retryCount || 0,
                latencyMs: Date.now() - startTime,
              },
            );

            await logRepo.update(notificationLog.id, {
              status: NotificationStatus.FAILED,
              error: errorMessage,
              metadata: standardizedMetadata,
              lastAttemptAt: new Date(),
            });
          } else {
            // Fallback if rendered not available
            await logRepo.update(notificationLog.id, {
              status: NotificationStatus.FAILED,
              error: errorMessage,
              lastAttemptAt: new Date(),
            });
          }
        }
        // Track metrics (outside transaction - these are non-critical)
        await this.metricsService.incrementFailed(
          payload.channel,
          payload.type,
        );

        this.logger.error(
          `Failed to send notification: ${payload.type} via ${payload.channel}`,
          error,
          {
            channel: payload.channel,
            type: payload.type,
            recipient: payload.recipient,
            userId: payload.userId,
            correlationId: payload.correlationId,
            jobId: isRecord(payload.data)
              ? getStringProperty(payload.data, 'jobId')
              : undefined,
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
    });
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
              error,
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
