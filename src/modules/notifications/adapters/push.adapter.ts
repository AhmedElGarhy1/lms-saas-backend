import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { PushNotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { TimeoutConfigService } from '../config/timeout.config';
import { FcmProvider, FcmMessage } from './providers/fcm-provider.interface';
import { FcmProviderImpl } from './providers/fcm.provider';
import pTimeout from 'p-timeout';
import { NotificationErrors } from '../exceptions/notification-errors';
import { NotificationEvents } from '@/shared/events/notification.events.enum';
import { PushTokenInvalidEvent } from '../events/notification.events';

@Injectable()
export class PushAdapter
  implements NotificationAdapter<PushNotificationPayload>, OnModuleInit
{
  private provider: FcmProvider | null = null;
  private readonly logger: Logger = new Logger(PushAdapter.name);

  constructor(
    private readonly metricsService: NotificationMetricsService,
    private readonly timeoutConfig: TimeoutConfigService,
    private readonly fcmProvider: FcmProviderImpl,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Always hold a reference to the FCM provider. Check isConfigured() at send
    // time to avoid init-order issues (FcmProviderImpl may initialize after us).
    this.provider = this.fcmProvider;
    this.logger.log('Push adapter initialized.');
  }

  /**
   * Build FCM message from push notification payload
   * Extracts deep links, sound, and TTL from payload.data
   */
  private buildFcmMessage(payload: PushNotificationPayload): FcmMessage {
    const fcmMessage: FcmMessage = {
      title: payload.title,
      body: payload.data.message || '',
    };

    // Extract data payload (deep links, custom data)
    if (payload.data) {
      // Filter out non-string values and convert to Record<string, string>
      const dataPayload: Record<string, string> = {};
      Object.entries(payload.data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          dataPayload[key] = value;
        } else if (value !== null && value !== undefined) {
          // Convert non-string values to strings
          dataPayload[key] = String(value);
        }
      });
      if (Object.keys(dataPayload).length > 0) {
        fcmMessage.data = dataPayload;
      }
    }

    // Extract sound from payload.data.sound
    if (payload.data?.sound && typeof payload.data.sound === 'string') {
      fcmMessage.sound = payload.data.sound;
    }

    // Extract TTL from payload.data.ttl (for future use)
    if (payload.data?.ttl && typeof payload.data.ttl === 'number') {
      fcmMessage.ttl = payload.data.ttl;
    }

    // Build Android config with deep link support
    const clickAction = payload.data?.clickAction || payload.data?.deepLink;
    if (clickAction) {
      fcmMessage.android = {
        priority: 'high',
        notification: {
          clickAction:
            typeof clickAction === 'string' ? clickAction : String(clickAction),
          sound: fcmMessage.sound,
        },
      };
    } else if (fcmMessage.sound) {
      // If only sound is provided without clickAction
      fcmMessage.android = {
        priority: 'high',
        notification: {
          sound: fcmMessage.sound,
        },
      };
    }

    // Build iOS (APNS) config
    if (fcmMessage.sound) {
      fcmMessage.apns = {
        payload: {
          aps: {
            sound: fcmMessage.sound,
          },
        },
      };
    }

    return fcmMessage;
  }

  /**
   * Heuristic: FCM device tokens are long alphanumeric strings (typically 100+ chars).
   * Email contains '@'; phone is shorter and often has '+' or digits only.
   */
  private looksLikeDeviceToken(value: string): boolean {
    const s = value.trim();
    if (s.length < 80) return false;
    if (s.includes('@')) return false;
    return true;
  }

  /**
   * Check if error indicates invalid token
   */
  private isInvalidTokenError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = error.code as string;
      return (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-argument'
      );
    }
    return false;
  }

  async send(payload: PushNotificationPayload): Promise<void> {
    // Type system ensures channel is PUSH, no runtime check needed
    const deviceToken = payload.recipient;
    const title = payload.title;
    const message = payload.data.message || '';

    // Validate payload
    if (!deviceToken || deviceToken.trim() === '') {
      throw NotificationErrors.missingNotificationContent(
        NotificationChannel.PUSH,
        'recipient (device token)',
      );
    }

    if (!title || title.trim() === '') {
      throw NotificationErrors.missingNotificationContent(
        NotificationChannel.PUSH,
        'title',
      );
    }

    if (!message || message.trim() === '') {
      throw NotificationErrors.missingNotificationContent(
        NotificationChannel.PUSH,
        'data.message',
      );
    }

    const userId = payload.userId ?? 'unknown';

    // Recipient must be an FCM device token. Pipeline often passes email/phone;
    // we need userId → token resolution (e.g. user_devices) for real push.
    if (!this.looksLikeDeviceToken(deviceToken)) {
      this.logger.warn(
        `Push skipped (recipient is not an FCM device token): type=${payload.type}, userId=${userId}. ` +
          'Store FCM tokens per user and pass token as recipient for PUSH.',
      );
      await this.metricsService.incrementFailed(
        NotificationChannel.PUSH,
        payload.type,
      );
      return;
    }

    // If FCM is not configured (e.g. init order, or key missing), skip (don't throw)
    if (!this.provider?.isConfigured()) {
      this.logger.log(
        `Push skipped (FCM not configured): type=${payload.type}, userId=${userId}`,
      );
      await this.metricsService.incrementFailed(
        NotificationChannel.PUSH,
        payload.type,
      );
      return;
    }

    this.logger.log(
      `Push send attempt: type=${payload.type}, userId=${userId}, token=${deviceToken.substring(0, 20)}...`,
    );

    const startTime = Date.now();
    try {
      // Build FCM message with deep links, sound, and TTL support
      const fcmMessage = this.buildFcmMessage(payload);

      // Wrap provider API call with timeout guard
      const timeoutMs = this.timeoutConfig.getTimeout(NotificationChannel.PUSH);
      await pTimeout(this.provider.sendMessage(deviceToken, fcmMessage), {
        milliseconds: timeoutMs,
        message: `Push notification send timeout after ${timeoutMs}ms`,
      });
      const latency = Date.now() - startTime;

      // Track metrics
      await this.metricsService.incrementSent(
        NotificationChannel.PUSH,
        payload.type,
      );
      await this.metricsService.recordLatency(
        NotificationChannel.PUSH,
        latency,
      );
      this.logger.log(
        `Push sent: type=${payload.type}, userId=${userId}, latency=${latency}ms`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Handle invalid token errors (critical for Egyptian market)
      // Don't retry invalid tokens - emit event for cleanup
      if (this.isInvalidTokenError(error)) {
        // Track as failed in metrics
        await this.metricsService.incrementFailed(
          NotificationChannel.PUSH,
          payload.type,
        );

        // Emit event for token cleanup (if userId is available)
        if (payload.userId) {
          this.eventEmitter.emit(
            NotificationEvents.PUSH_TOKEN_INVALID,
            new PushTokenInvalidEvent(deviceToken, payload.userId),
          );
          this.logger.warn(
            `Invalid push token detected - event emitted for cleanup - token: ${deviceToken.substring(0, 20)}..., userId: ${payload.userId}`,
          );
        } else {
          this.logger.warn(
            `Invalid push token detected but no userId provided - token: ${deviceToken.substring(0, 20)}...`,
          );
        }

        // Don't throw - allows cleanup, prevents retry waste
        return;
      }

      // For other errors (network, quota, etc.), track and throw for retry
      await this.metricsService.incrementFailed(
        NotificationChannel.PUSH,
        payload.type,
      );

      // Re-throw error - global handler will log it and trigger retry
      throw NotificationErrors.notificationSendingFailed(
        NotificationChannel.PUSH,
        errorMessage,
      );
    }
  }
}
