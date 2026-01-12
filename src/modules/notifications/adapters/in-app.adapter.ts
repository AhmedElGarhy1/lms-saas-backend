import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { NotificationConfig } from '../config/notification.config';
import { InAppNotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationRepository } from '../repositories/notification.repository';
import { Notification } from '../entities/notification.entity';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationEvents } from '@/shared/events/notification.events.enum';
import {
  NotificationCreatedEvent,
  NotificationDeliveredEvent,
  NotificationFailedEvent,
} from '../events/notification.events';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { NotificationErrors } from '../exceptions/notification-errors';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { buildStandardizedMetadata } from '../utils/metadata-builder.util';
import { RenderedNotification } from '../manifests/types/manifest.types';

interface ExtractedNotificationData {
  title: string;
  message: string;
  priority: number;
  expiresAt: Date | undefined;
}

interface DeliveryResult {
  delivered: boolean;
  attempts: number;
  error: Error | string | null;
  latencyMs: number;
}

@Injectable()
export class InAppAdapter
  implements NotificationAdapter<InAppNotificationPayload>
{
  private readonly maxRetries: number;
  private readonly maxRetryDelayMs: number;
  private readonly logger: Logger = new Logger(InAppAdapter.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
    private readonly moduleRef: ModuleRef,
    private readonly eventEmitter: EventEmitter2,
    private readonly logRepository: NotificationLogRepository,
    private readonly metricsService: NotificationMetricsService,
  ) {
    // Load retry configuration from Config (IN_APP-specific for WebSocket delivery)
    this.maxRetries = NotificationConfig.inAppRetry.maxAttempts;
    this.maxRetryDelayMs = NotificationConfig.inAppRetry.maxDelayMs;
  }

  async send(payload: InAppNotificationPayload): Promise<void> {
    // Type system ensures channel is IN_APP, no runtime check needed
    if (!payload.userId) {
      throw NotificationErrors.missingNotificationContent('in_app', 'userId');
    }

    const startTime = Date.now();

    // 1. Extract notification data from payload
    const notificationData = this.extractNotificationData(payload);

    // Note: Idempotency check is handled at NotificationService level via NotificationIdempotencyCacheService
    // No need for duplicate check here - it's already done before adapter.send() is called

    // 2. Create notification entity
    const notification = await this.createNotificationEntity(
      payload,
      notificationData,
    );

    // 4. Emit created event
    this.emitCreatedEvent(notification, payload.userId, payload);

    // 5. Deliver via WebSocket with retry logic
    const deliveryResult = await this.deliverWithRetry(
      payload.userId,
      notification,
      startTime,
    );

    // 6. Update notification status in database
    await this.updateNotificationStatus(notification, deliveryResult.delivered);

    // 7. Create audit log
    await this.createAuditLog(payload, notification, deliveryResult, startTime);

    // 8. Track metrics (metrics failure should not break notification flow)
    try {
      await this.trackMetrics(
        payload.userId,
        payload,
        deliveryResult,
        startTime,
      );
    } catch {
      // Metrics are best-effort, don't spam logs with failures
    }

    // 9. Emit delivery events
    this.emitDeliveryEvent(
      notification,
      payload.userId,
      payload,
      deliveryResult,
    );
  }

  /**
   * Extract notification data from payload with defaults
   */
  private extractNotificationData(
    payload: InAppNotificationPayload,
  ): ExtractedNotificationData {
    const getOrDefault = <T>(value: T | undefined, fallback: T): T => {
      return value ?? fallback;
    };

    const title = getOrDefault(
      payload.title ?? payload.data.title ?? payload.data.subject ?? undefined,
      'New Notification',
    );
    const message = getOrDefault(
      payload.data.message ??
        payload.data.content ??
        payload.data.text ??
        undefined,
      '',
    );
    const priority = payload.data.priority ?? 0;
    const expiresAt = payload.data.expiresAt
      ? new Date(payload.data.expiresAt)
      : undefined;

    return {
      title,
      message,
      priority,
      expiresAt,
    };
  }

  /**
   * Create notification entity in database
   */
  private async createNotificationEntity(
    payload: InAppNotificationPayload,
    data: ExtractedNotificationData,
  ): Promise<Notification> {
    // Set createdBy to actorId if provided, otherwise fallback to userId (recipient)
    // This ensures notifications created in queue context (no RequestContext) have a valid createdBy
    const createdBy = payload.actorId || payload.userId;

    return this.notificationRepository.createNotification({
      userId: payload.userId,
      title: data.title,
      message: data.message,
      type: payload.type,
      priority: data.priority,
      expiresAt: data.expiresAt,
      data: payload.data,
      profileType: payload.profileType,
      profileId: payload.profileId,
      isArchived: false,
      readAt: undefined,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
      createdByProfileId: createdBy, // Set explicitly for queue context (no RequestContext)
    });
  }

  /**
   * Emit notification created event
   */
  private emitCreatedEvent(
    notification: Notification,
    userId: string,
    payload: InAppNotificationPayload,
  ): void {
    this.eventEmitter.emit(
      NotificationEvents.CREATED,
      new NotificationCreatedEvent(
        notification.id,
        userId,
        payload.type,
        NotificationChannel.IN_APP,
      ),
    );
  }

  /**
   * Deliver notification via WebSocket with retry logic
   *
   * Note: IN_APP notifications use custom retry logic here because they are sent directly
   * (not queued via BullMQ). Unlike EMAIL, SMS, and WhatsApp which are queued and retried
   * by BullMQ, IN_APP notifications need immediate delivery with retry for WebSocket failures.
   * This ensures real-time delivery while handling transient WebSocket connection issues.
   */
  private async deliverWithRetry(
    userId: string,
    notification: Notification,
    startTime: number,
  ): Promise<DeliveryResult> {
    let delivered = false;
    let deliveryError: Error | string | null = null;
    let attempt = 0;
    const deliveryStartTime = Date.now();

    while (attempt < this.maxRetries && !delivered) {
      attempt++;
      try {
        await this.notificationGateway.sendToUser(userId, notification);
        delivered = true;

        // Track successful delivery attempt
        if (attempt > 1) {
          await this.metricsService.incrementRetry(NotificationChannel.IN_APP);
        }
      } catch (error) {
        deliveryError = error;
        const latency = Date.now() - deliveryStartTime;

        if (attempt >= this.maxRetries) {
          this.logger.error(
            `Failed to deliver notification via WebSocket after ${this.maxRetries} attempts (total latency: ${latency}ms) - notificationId: ${notification.id}, userId: ${userId}`,
            error instanceof Error ? error.stack : String(error),
          );
          // Track retry metric for failed attempts
          await this.metricsService.incrementRetry(NotificationChannel.IN_APP);
        } else {
          // Calculate exponential backoff delay
          const delay = this.calculateRetryDelay(attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.logger.warn(
            `Retrying WebSocket delivery (attempt ${attempt}/${this.maxRetries}, delay: ${delay}ms) - notificationId: ${notification.id}, userId: ${userId}`,
          );
          // Track retry attempt
          await this.metricsService.incrementRetry(NotificationChannel.IN_APP);
        }
      }
    }

    const totalLatency = Date.now() - startTime;
    return {
      delivered,
      attempts: attempt,
      error: deliveryError,
      latencyMs: totalLatency,
    };
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const baseDelay = 1000 * Math.pow(2, attempt - 1);
    return Math.min(baseDelay, this.maxRetryDelayMs);
  }

  /**
   * Update notification status in database
   */
  private async updateNotificationStatus(
    notification: Notification,
    delivered: boolean,
  ): Promise<void> {
    if (notification.id) {
      notification.status = delivered
        ? NotificationStatus.DELIVERED
        : NotificationStatus.FAILED;
      await this.notificationRepository.update(notification.id, {
        status: notification.status,
      });
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    payload: InAppNotificationPayload,
    notification: Notification,
    deliveryResult: DeliveryResult,
    startTime: number,
  ): Promise<void> {
    try {
      const totalLatency = Date.now() - startTime;
      const retryHistory: Array<{ attempt: number; timestamp: Date }> = [];
      for (let i = 1; i <= deliveryResult.attempts; i++) {
        retryHistory.push({
          attempt: i,
          timestamp: new Date(startTime + (i - 1) * 1000), // Approximate
        });
      }

      // Extract template path and rendered content
      const templatePath = (payload.data.template as string) || '';
      const renderedContent =
        notification.message || payload.data.message || '';

      // Create a RenderedNotification object for metadata building
      const rendered: RenderedNotification = {
        type: payload.type,
        channel: NotificationChannel.IN_APP,
        content: renderedContent,
        metadata: {
          template: templatePath,
          locale: payload.locale || 'en',
        },
      };

      // Build standardized metadata
      const standardizedMetadata = buildStandardizedMetadata(
        payload,
        rendered,
        {
          jobId: (payload.data.jobId as string) || undefined,
          correlationId: payload.correlationId || '',
          retryCount: deliveryResult.attempts - 1,
          latencyMs: totalLatency,
          attempts: deliveryResult.attempts,
          deliveredAt: deliveryResult.delivered ? new Date() : undefined,
          notificationId: notification.id,
          payloadData: payload.data,
          retryHistory,
        },
      );

      await this.logRepository.create({
        type: payload.type,
        channel: NotificationChannel.IN_APP,
        status: deliveryResult.delivered
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED,
        recipient: payload.recipient || payload.userId || 'unknown',
        metadata: standardizedMetadata,
        userId: payload.userId,
        centerId: payload.centerId,
        profileType: payload.profileType,
        profileId: payload.profileId,
        error: deliveryResult.delivered
          ? undefined
          : deliveryResult.error
            ? deliveryResult.error instanceof Error
              ? deliveryResult.error.message
              : String(deliveryResult.error)
            : 'Unknown error',
        retryCount: deliveryResult.attempts - 1, // retryCount = attempts - 1 (first attempt doesn't count as retry)
        lastAttemptAt: new Date(),
        createdByProfileId: SYSTEM_USER_ID, // Set system user for adapter context
      });
    } catch (logError) {
      // Don't fail notification delivery if logging fails
      // Logger is fault-tolerant, but we still log the NotificationLog creation failure
      this.logger.error(
        `Failed to create NotificationLog for IN_APP notification - notificationId: ${notification.id}, userId: ${payload.userId}`,
        logError instanceof Error ? logError.stack : String(logError),
      );
    }
  }

  /**
   * Track metrics for delivery
   */
  private async trackMetrics(
    userId: string,
    payload: InAppNotificationPayload,
    deliveryResult: DeliveryResult,
    startTime: number,
  ): Promise<void> {
    const latency = Date.now() - startTime;

    if (deliveryResult.delivered) {
      await this.metricsService.incrementSent(
        NotificationChannel.IN_APP,
        payload.type,
      );
      await this.metricsService.recordLatency(
        NotificationChannel.IN_APP,
        latency,
      );
    } else {
      await this.metricsService.incrementFailed(
        NotificationChannel.IN_APP,
        payload.type,
      );
    }

    // Track retry attempts (if any)
    if (deliveryResult.attempts > 1) {
      for (let i = 1; i < deliveryResult.attempts; i++) {
        await this.metricsService.incrementRetry(NotificationChannel.IN_APP);
      }
    }
  }

  /**
   * Emit delivery event (delivered or failed)
   */
  private emitDeliveryEvent(
    notification: Notification,
    userId: string,
    payload: InAppNotificationPayload,
    deliveryResult: DeliveryResult,
  ): void {
    if (deliveryResult.delivered) {
      this.eventEmitter.emit(
        NotificationEvents.DELIVERED,
        new NotificationDeliveredEvent(
          notification.id,
          userId,
          NotificationChannel.IN_APP,
          notification.status,
          deliveryResult.attempts,
          deliveryResult.latencyMs,
        ),
      );
    } else {
      this.eventEmitter.emit(
        NotificationEvents.FAILED,
        new NotificationFailedEvent(
          notification.id,
          userId,
          NotificationChannel.IN_APP,
          notification.status,
          deliveryResult.error
            ? deliveryResult.error instanceof Error
              ? deliveryResult.error.message
              : String(deliveryResult.error)
            : undefined,
          deliveryResult.attempts,
        ),
      );
    }
  }
}
