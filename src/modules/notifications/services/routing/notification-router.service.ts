import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationPayload } from '../../types/notification-payload.interface';
import { NotificationJobData } from '../../types/notification-job-data.interface';
import { RenderedNotification } from '../../manifests/types/manifest.types';
import { NotificationSenderService } from '../notification-sender.service';
import { InAppNotificationService } from '../in-app-notification.service';
import { NotificationRenderer } from '../../renderer/notification-renderer.service';
import { NotificationManifestResolver } from '../../manifests/registry/notification-manifest-resolver.service';
import { NotificationIdempotencyCacheService } from '../notification-idempotency-cache.service';
import { NotificationMetricsService } from '../notification-metrics.service';
import { ChannelRetryStrategyService } from '../channel-retry-strategy.service';
import { RecipientValidationService } from '../recipient-validation.service';
import { PayloadBuilderService } from '../payload-builder.service';
import { BaseService } from '@/shared/common/services/base.service';
import {
  QUEUE_CONSTANTS,
  STRING_CONSTANTS,
} from '../../constants/notification.constants';
import { NotificationProcessingContext } from '../pipeline/notification-pipeline.service';

/**
 * Service responsible for routing notifications to channels
 * Handles: recipient validation, idempotency checks, template rendering, payload building, sending/enqueueing
 */
@Injectable()
export class NotificationRouterService extends BaseService {
  private readonly logger: Logger = new Logger(NotificationRouterService.name);

  constructor(
    @InjectQueue('notifications') private readonly queue: Queue,
    private readonly senderService: NotificationSenderService,
    private readonly inAppNotificationService: InAppNotificationService,
    private readonly renderer: NotificationRenderer,
    private readonly manifestResolver: NotificationManifestResolver,
    private readonly retryStrategyService: ChannelRetryStrategyService,
    private readonly recipientValidator: RecipientValidationService,
    private readonly payloadBuilder: PayloadBuilderService,
    private readonly idempotencyCache?: NotificationIdempotencyCacheService,
    private readonly metricsService?: NotificationMetricsService,
  ) {
    super();
  }

  /**
   * Route notifications to channels
   * Processes each channel: validates recipient, checks idempotency, renders template, builds payload, sends/enqueues
   */
  async route(
    context: NotificationProcessingContext,
    preRenderedCache?: Map<string, RenderedNotification>,
  ): Promise<void> {
    const {
      recipient,
      phone,
      finalChannels,
      mapping,
      manifest,
      templateData,
      locale,
      centerId,
      userId,
      profileType,
      profileId,
      eventName,
      correlationId,
      audience,
    } = context;

    if (
      !finalChannels ||
      !mapping ||
      !manifest ||
      !templateData ||
      !locale ||
      !userId ||
      !eventName ||
      !correlationId
    ) {
      return;
    }

    // Collect payloads for bulk enqueue (non-IN_APP channels)
    const payloadsToEnqueue: NotificationPayload[] = [];
    // Track idempotency locks that need to be released after bulk enqueue
    const locksToRelease: Array<{
      correlationId: string;
      type: NotificationType;
      channel: NotificationChannel;
      recipient: string;
    }> = [];
    const priority = manifest.priority || 0;

    // Process each final channel (after dynamic selection)
    for (const channel of finalChannels) {
      // Validate channel support for the audience
      if (audience) {
        try {
          // Validate channel exists for this audience
          this.manifestResolver.getChannelConfig(manifest, audience, channel);
        } catch {
          this.logger.error(
            `Channel ${channel} not supported for audience ${audience} in notification type ${mapping.type}`,
            {
              notificationType: mapping.type,
              channel,
              audience,
              eventName,
            },
          );
          continue;
        }
      } else {
        // Fallback: check if channel exists in any audience
        const hasChannel = Object.values(manifest.audiences).some(
          (audienceConfig) => audienceConfig.channels[channel],
        );
        if (!hasChannel) {
          this.logger.error(
            `Channel ${channel} not supported for notification type ${mapping.type}`,
            {
              notificationType: mapping.type,
              channel,
              eventName,
            },
          );
          continue;
        }
      }

      // Determine and validate recipient for this channel (pure service)
      const channelRecipient =
        this.recipientValidator.determineAndValidateRecipient(
          channel,
          recipient,
          phone,
          userId,
        );

      if (!channelRecipient) {
        // Log why recipient validation failed
        if (
          channel === NotificationChannel.EMAIL &&
          !recipient?.includes('@')
        ) {
          // Skipping EMAIL channel - no email available (normal, no logging needed)
        } else if (
          (channel === NotificationChannel.SMS ||
            channel === NotificationChannel.WHATSAPP) &&
          !phone
        ) {
          this.logger.warn(
            `Skipping ${channel} channel: no phone for user ${userId}`,
            { userId, eventName, channel },
          );
        }

        // Record failed metric if validation failed due to format
        if (this.metricsService && channelRecipient === null) {
          await this.metricsService.incrementFailed(channel, mapping.type);
        }

        continue; // Recipient validation failed or skipped
      }

      // Check idempotency with distributed lock
      const idempotencyResult = await this.checkIdempotency(
        correlationId,
        mapping.type,
        channel,
        channelRecipient,
      );

      if (!idempotencyResult.shouldProceed) {
        continue; // Already sent or lock failed
      }

      // Build base payload (pure service)
      const basePayload = this.payloadBuilder.buildBasePayload(
        channelRecipient,
        channel,
        mapping.type,
        manifest,
        locale,
        centerId,
        userId,
        profileType ?? undefined,
        profileId ?? undefined,
        correlationId,
        context.actorId,
      );

      // Get channel config for WhatsApp (needed for template name)
      const channelConfig = audience
        ? this.manifestResolver.getChannelConfig(manifest, audience, channel)
        : Object.values(manifest.audiences)[0]?.channels[channel];

      // Render template and build payload (use cache if available for bulk optimization)
      // Skip rendering for WhatsApp - it uses template messages, not rendered content
      let rendered: RenderedNotification;
      if (channel === NotificationChannel.WHATSAPP) {
        // Create minimal rendered notification for WhatsApp (not used, but required for type)
        rendered = {
          type: mapping.type,
          channel,
          content: '',
          metadata: {
            template: channelConfig?.template || '',
            locale,
          },
        };
      } else {
        const cacheKey = this.getTemplateCacheKey(
          mapping.type,
          channel,
          locale,
          templateData as Record<string, unknown>,
          audience,
        );

        if (preRenderedCache && preRenderedCache.has(cacheKey)) {
          // Use pre-rendered content from cache (bulk optimization)
          rendered = preRenderedCache.get(cacheKey)!;
        } else {
          // Render template (normal flow or cache miss)
          rendered = await this.renderer.render(
            mapping.type,
            channel,
            templateData as Record<string, unknown>,
            locale,
            audience,
          );
          // Store in cache if provided
          if (preRenderedCache) {
            preRenderedCache.set(cacheKey, rendered);
          }
        }
      }

      // Build channel-specific payload (pure service)
      // Pass manifest for requiredVariables and channelConfig for template
      const payload = this.payloadBuilder.buildPayload(
        channel,
        basePayload,
        rendered,
        templateData,
        manifest,
        channelConfig,
      );

      if (!payload) {
        // Log why payload building failed
        if (channel === NotificationChannel.EMAIL && !rendered.subject) {
          this.logger.error(
            `Missing subject for EMAIL notification: ${mapping.type}`,
            {
              notificationType: mapping.type,
              channel,
              userId,
            },
          );
        } else {
          this.logger.warn(`Failed to build payload for ${channel} channel`, {
            notificationType: mapping.type,
            channel,
            userId,
          });
        }
        continue; // Payload building failed (e.g., missing subject for email)
      }

      // Handle IN_APP directly (low latency requirement) or collect for bulk enqueue
      if (channel === NotificationChannel.IN_APP) {
        // Send IN_APP directly without queuing for low latency
        try {
          await this.sendOrEnqueueNotification(
            channel,
            payload,
            userId,
            eventName,
            correlationId,
            priority,
          );
        } finally {
          // Release idempotency lock if acquired
          if (
            idempotencyResult.lockAcquired &&
            this.idempotencyCache &&
            correlationId
          ) {
            await this.idempotencyCache.releaseLock(
              correlationId,
              mapping.type,
              channel,
              channelRecipient,
            );
          }
        }
      } else {
        // Collect non-IN_APP payloads for bulk enqueue
        payloadsToEnqueue.push(payload);
        // Track lock for release after bulk enqueue
        if (
          idempotencyResult.lockAcquired &&
          this.idempotencyCache &&
          correlationId
        ) {
          locksToRelease.push({
            correlationId,
            type: mapping.type,
            channel,
            recipient: channelRecipient,
          });
        }
      }
    }

    // Enqueue all collected payloads in bulk (single Redis round-trip)
    if (payloadsToEnqueue.length > 0) {
      try {
        await this.enqueueNotifications(payloadsToEnqueue, priority);

        // Release idempotency locks after successful bulk enqueue
        if (this.idempotencyCache) {
          await Promise.allSettled(
            locksToRelease.map((lock) =>
              this.idempotencyCache!.releaseLock(
                lock.correlationId,
                lock.type,
                lock.channel,
                lock.recipient,
              ),
            ),
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to bulk enqueue notifications: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined,
          {
            eventName,
            userId,
            correlationId,
            payloadCount: payloadsToEnqueue.length,
          },
        );
        // Release locks on failure so they can be retried
        if (this.idempotencyCache) {
          await Promise.allSettled(
            locksToRelease.map((lock) =>
              this.idempotencyCache!.releaseLock(
                lock.correlationId,
                lock.type,
                lock.channel,
                lock.recipient,
              ),
            ),
          );
        }
        // Don't throw - individual failures are handled by the queue processor
      }
    }
  }

  /**
   * Check idempotency with distributed lock
   */
  private async checkIdempotency(
    correlationId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
    channelRecipient: string,
  ): Promise<{ shouldProceed: boolean; lockAcquired: boolean }> {
    if (!this.idempotencyCache || !correlationId) {
      return { shouldProceed: true, lockAcquired: false };
    }

    let lockAcquired = false;
    try {
      lockAcquired = await this.idempotencyCache.acquireLock(
        correlationId,
        notificationType,
        channel,
        channelRecipient,
      );

      if (!lockAcquired) {
        // Lock not acquired - another process is handling this notification (normal, no logging needed)
        return { shouldProceed: false, lockAcquired: false };
      }

      const alreadySent = await this.idempotencyCache.checkAndSet(
        correlationId,
        notificationType,
        channel,
        channelRecipient,
      );

      if (alreadySent) {
        await this.idempotencyCache.releaseLock(
          correlationId,
          notificationType,
          channel,
          channelRecipient,
        );
        // Duplicate notification detected (normal idempotency check, no logging needed)
        return { shouldProceed: false, lockAcquired: false };
      }

      return { shouldProceed: true, lockAcquired: true };
    } catch (error) {
      if (lockAcquired) {
        await this.idempotencyCache.releaseLock(
          correlationId,
          notificationType,
          channel,
          channelRecipient,
        );
      }
      this.logger.warn(
        `Idempotency check failed, proceeding anyway: ${notificationType}:${channel}`,
        {
          correlationId,
          type: notificationType,
          channel,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return { shouldProceed: true, lockAcquired: false };
    }
  }

  /**
   * Send notification directly (IN_APP) or enqueue for async processing
   */
  private async sendOrEnqueueNotification(
    channel: NotificationChannel,
    payload: NotificationPayload,
    userId: string,
    eventName: NotificationType,
    correlationId: string,
    priority: number,
  ): Promise<void> {
    if (channel === NotificationChannel.IN_APP) {
      // Check rate limit before sending
      const userWithinLimit =
        await this.inAppNotificationService.checkUserRateLimit(userId);
      if (!userWithinLimit) {
        const rateLimitConfig =
          this.inAppNotificationService.getRateLimitConfig();
        this.logger.warn(
          `User ${userId} exceeded rate limit (${rateLimitConfig.limit}/${rateLimitConfig.windowSeconds}s) for IN_APP notification, skipping delivery`,
          {
            userId,
            eventName,
            correlationId,
            limit: rateLimitConfig.limit,
            window: `${rateLimitConfig.windowSeconds} seconds`,
          },
        );
        return;
      }

      // Send IN_APP directly without queuing for low latency
      try {
        await this.senderService.send(payload);
      } catch (error) {
        this.logger.error(
          `Failed to send IN_APP notification directly: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined,
          {
            userId,
            eventName,
            correlationId,
          },
        );
        // Don't throw - already logged, continue with other channels
      }
    } else {
      // Enqueue for async processing
      await this.enqueueJob(payload, priority);
    }
  }

  /**
   * Enqueue a notification job to the BullMQ queue
   */
  private async enqueueJob(
    payload: NotificationPayload,
    priority: number = 0,
  ): Promise<void> {
    const jobData: NotificationJobData = {
      ...payload,
      retryCount: 0,
    };

    // Get channel-specific retry configuration
    const retryConfig = this.retryStrategyService.getRetryConfig(
      payload.channel,
    );

    await this.queue.add('send-notification', jobData, {
      attempts: retryConfig.maxAttempts,
      priority,
      backoff: {
        type: retryConfig.backoffType,
        delay: retryConfig.backoffDelay,
      },
      removeOnComplete: {
        age: QUEUE_CONSTANTS.COMPLETED_JOB_AGE_SECONDS,
      },
      removeOnFail: {
        age: QUEUE_CONSTANTS.FAILED_JOB_AGE_SECONDS,
      },
    });
  }

  /**
   * Enqueue multiple notifications in bulk
   */
  async enqueueNotifications(
    payloads: NotificationPayload[],
    priority: number = 0,
  ): Promise<Job<NotificationJobData>[]> {
    if (payloads.length === 0) {
      return [];
    }

    const jobs = payloads.map((payload) => {
      const jobData: NotificationJobData = {
        ...payload,
        retryCount: 0,
      };

      const retryConfig = this.retryStrategyService.getRetryConfig(
        payload.channel,
      );

      return {
        name: 'send-notification',
        data: jobData,
        opts: {
          attempts: retryConfig.maxAttempts,
          priority,
          backoff: {
            type: retryConfig.backoffType,
            delay: retryConfig.backoffDelay,
          },
          removeOnComplete: {
            age: QUEUE_CONSTANTS.COMPLETED_JOB_AGE_SECONDS,
          },
          removeOnFail: {
            age: QUEUE_CONSTANTS.FAILED_JOB_AGE_SECONDS,
          },
        },
      };
    });

    // Use BullMQ bulk add for efficiency (single Redis round-trip)
    return this.queue.addBulk(jobs);
  }

  /**
   * Get template cache key for bulk rendering optimization
   */
  private getTemplateCacheKey(
    notificationType: NotificationType,
    channel: NotificationChannel,
    locale: string,
    templateData: Record<string, unknown>,
    audience?: string,
  ): string {
    // Create hash of template data (excluding recipient-specific fields)
    const dataForHash = { ...templateData };
    delete dataForHash.userId;
    delete dataForHash.email;
    delete dataForHash.phone;
    delete dataForHash.locale;

    const dataHash = JSON.stringify(dataForHash);
    return `${notificationType}:${channel}:${locale}:${audience || 'default'}:${dataHash}`;
  }
}
