import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { NotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationRepository } from '../repositories/notification.repository';
import { Notification } from '../entities/notification.entity';
import { NotificationStatus as NotificationEntityStatus } from '../entities/notification.entity';
import { NotificationGateway } from '../gateways/notification.gateway';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationActionType } from '../enums/notification-action-type.enum';
import { NotificationEvents } from '@/shared/events/notification.events.enum';
import {
  NotificationCreatedEvent,
  NotificationDeliveredEvent,
  NotificationFailedEvent,
} from '../events/notification.events';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationMetricsService } from '../services/notification-metrics.service';

interface ExtractedNotificationData {
  title: string;
  message: string;
  actionUrl: string | undefined;
  actionType: NotificationActionType;
  priority: number;
  icon: string | undefined;
  expiresAt: Date | undefined;
}

interface DeliveryResult {
  delivered: boolean;
  attempts: number;
  error: Error | string | null;
  latencyMs: number;
}

@Injectable()
export class InAppAdapter implements NotificationAdapter {
  private readonly maxRetries: number;
  private readonly maxRetryDelayMs: number;

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logRepository: NotificationLogRepository,
    private readonly metricsService: NotificationMetricsService,
    private readonly configService: ConfigService,
  ) {
    // Load retry configuration from environment
    this.maxRetries = parseInt(
      this.configService.get<string>('NOTIFICATION_RETRY_MAX_ATTEMPTS') || '3',
      10,
    );
    this.maxRetryDelayMs = parseInt(
      this.configService.get<string>('NOTIFICATION_RETRY_MAX_DELAY_MS') ||
        '10000',
      10,
    );
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (payload.channel !== NotificationChannel.IN_APP) {
      throw new Error('InAppAdapter can only send IN_APP notifications');
    }

    if (!payload.userId) {
      throw new Error('userId is required for in-app notifications');
    }

    const startTime = Date.now();

    try {
      // 1. Extract notification data from payload
      const notificationData = this.extractNotificationData(payload);

      // 2. Create notification entity
      const notification = await this.createNotificationEntity(
        payload,
        notificationData,
      );

      // 3. Emit created event
      this.emitCreatedEvent(notification, payload.userId!, payload);

      // 4. Deliver via WebSocket with retry logic
      const deliveryResult = await this.deliverWithRetry(
        payload.userId!,
        notification,
        startTime,
      );

      // 5. Update notification status in database
      await this.updateNotificationStatus(
        notification,
        deliveryResult.delivered,
      );

      // 6. Create audit log
      await this.createAuditLog(
        payload,
        notification,
        deliveryResult,
        startTime,
      );

      // 7. Track metrics
      await this.trackMetrics(
        payload.userId!,
        payload,
        deliveryResult,
        startTime,
      );

      // 8. Emit delivery events
      this.emitDeliveryEvent(
        notification,
        payload.userId!,
        payload,
        deliveryResult,
      );

      // 9. Log final status
      this.logFinalStatus(notification, payload, deliveryResult, startTime);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send in-app notification`,
        errorMessage,
        'InAppAdapter',
        {
          userId: payload.userId,
          type: payload.type,
        },
      );
      // Track failure metric
      await this.metricsService.incrementFailed(
        NotificationChannel.IN_APP,
        payload.type,
      );
      // Don't throw - graceful failure, notification is logged
    }
  }

  /**
   * Extract notification data from payload with defaults
   */
  private extractNotificationData(
    payload: NotificationPayload,
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
    const actionUrl = payload.data.actionUrl ?? payload.data.url ?? undefined;
    const actionType = payload.data.actionType
      ? (payload.data.actionType as NotificationActionType)
      : actionUrl
        ? NotificationActionType.NAVIGATE
        : NotificationActionType.NONE;
    const priority = payload.data.priority ?? 0;
    const icon = payload.data.icon ?? undefined;
    const expiresAt = payload.data.expiresAt
      ? new Date(payload.data.expiresAt)
      : undefined;

    return {
      title,
      message,
      actionUrl,
      actionType,
      priority,
      icon,
      expiresAt,
    };
  }

  /**
   * Create notification entity in database
   */
  private async createNotificationEntity(
    payload: NotificationPayload,
    data: ExtractedNotificationData,
  ): Promise<Notification> {
    return this.notificationRepository.createNotification({
      userId: payload.userId,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      actionType: data.actionType,
      type: payload.type,
      priority: data.priority,
      icon: data.icon,
      expiresAt: data.expiresAt,
      data: payload.data,
      profileType: payload.profileType,
      profileId: payload.profileId,
      isArchived: false,
      readAt: undefined,
      channel: NotificationChannel.IN_APP,
      status: NotificationEntityStatus.PENDING,
    });
  }

  /**
   * Emit notification created event
   */
  private emitCreatedEvent(
    notification: Notification,
    userId: string,
    payload: NotificationPayload,
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
        const latency = Date.now() - deliveryStartTime;
        this.logger.debug(
          `Notification delivered via WebSocket in ${latency}ms (attempt ${attempt}/${this.maxRetries})`,
          'InAppAdapter',
          {
            notificationId: notification.id,
            userId,
            attempt,
            latency,
          },
        );

        // Track successful delivery attempt
        if (attempt > 1) {
          await this.metricsService.incrementRetry(NotificationChannel.IN_APP);
        }
      } catch (error) {
        deliveryError = error;
        const latency = Date.now() - deliveryStartTime;

        if (attempt >= this.maxRetries) {
          this.logger.error(
            `Failed to deliver notification via WebSocket after ${this.maxRetries} attempts (total latency: ${latency}ms): ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error.stack : undefined,
            'InAppAdapter',
            {
              notificationId: notification.id,
              userId,
              attempts: this.maxRetries,
              latency,
            },
          );
          // Track retry metric for failed attempts
          await this.metricsService.incrementRetry(NotificationChannel.IN_APP);
        } else {
          // Calculate exponential backoff delay
          const delay = this.calculateRetryDelay(attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.logger.warn(
            `Retrying WebSocket delivery (attempt ${attempt}/${this.maxRetries}, delay: ${delay}ms)`,
            'InAppAdapter',
            {
              notificationId: notification.id,
              userId,
              attempt,
              delay,
              latency,
            },
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
        ? NotificationEntityStatus.DELIVERED
        : NotificationEntityStatus.FAILED;
      await this.notificationRepository.update(notification.id, {
        status: notification.status,
      });
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    payload: NotificationPayload,
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

      const logEntry = await this.logRepository.create({
        type: payload.type,
        channel: NotificationChannel.IN_APP,
        status: deliveryResult.delivered
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED,
        recipient: payload.recipient || payload.userId || 'unknown',
        metadata: {
          notificationId: notification.id,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          actionType: notification.actionType,
          priority: notification.priority,
          // Enhanced metadata for debugging
          eventType: payload.data.eventName,
          payloadData: payload.data,
          attempts: deliveryResult.attempts,
          retryHistory,
          latencyMs: totalLatency,
          deliveredAt: deliveryResult.delivered ? new Date() : undefined,
        },
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
      });
      this.logger.debug(
        `NotificationLog created for IN_APP notification: ${logEntry.id}`,
        'InAppAdapter',
        {
          notificationId: notification.id,
          logId: logEntry.id,
          attempts: deliveryResult.attempts,
          latency: totalLatency,
        },
      );
    } catch (logError) {
      // Don't fail notification delivery if logging fails
      this.logger.warn(
        `Failed to create NotificationLog for IN_APP notification: ${logError instanceof Error ? logError.message : String(logError)}`,
        'InAppAdapter',
        {
          notificationId: notification.id,
          userId: payload.userId,
        },
      );
    }
  }

  /**
   * Track metrics for delivery
   */
  private async trackMetrics(
    userId: string,
    payload: NotificationPayload,
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
    payload: NotificationPayload,
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

  /**
   * Log final delivery status
   */
  private logFinalStatus(
    notification: Notification,
    payload: NotificationPayload,
    deliveryResult: DeliveryResult,
    startTime: number,
  ): void {
    const totalLatency = Date.now() - startTime;
    this.logger.debug(
      `In-app notification ${deliveryResult.delivered ? 'delivered' : 'failed'}: ${notification.id} to user ${payload.userId} (${deliveryResult.attempts} attempt(s), ${totalLatency}ms)`,
      'InAppAdapter',
      {
        notificationId: notification.id,
        userId: payload.userId,
        status: notification.status,
        attempts: deliveryResult.attempts,
        latency: totalLatency,
        delivered: deliveryResult.delivered,
      },
    );
  }
}
