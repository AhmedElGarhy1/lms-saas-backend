import { Injectable } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { NotificationJobData } from '../types/notification-job-data.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import {
  NotificationPayload,
  EmailNotificationPayload,
  SmsNotificationPayload,
  WhatsAppNotificationPayload,
  InAppNotificationPayload,
  PushNotificationPayload,
} from '../types/notification-payload.interface';
import { NotificationSenderService } from './notification-sender.service';
import { ChannelSelectionService } from './channel-selection.service';
import { NotificationTemplateService } from './notification-template.service';
import { InAppNotificationService } from './in-app-notification.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ChannelRetryStrategyService } from './channel-retry-strategy.service';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationManifest } from '../manifests/types/manifest.types';
import { NotificationRenderer } from '../renderer/notification-renderer.service';
import { RenderedNotification } from '../manifests/types/manifest.types';
import { NotificationIdempotencyCacheService } from './notification-idempotency-cache.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RequestContext } from '@/shared/common/context/request.context';
import { randomUUID, createHash } from 'crypto';
import { NotificationEvent } from '../types/notification-event.types';
import pLimit from 'p-limit';
import { RecipientInfo } from '../types/recipient-info.interface';
import { NotificationMetricsService } from './notification-metrics.service';
import {
  logNotificationStart,
  logNotificationComplete,
  logNotificationError,
} from '../utils/notification-metrics-logger.util';
import { NotificationTemplateData } from '../types/template-data.types';
import { createUserId, createCorrelationId } from '../types/branded-types';
import {
  isValidEmail,
  isValidE164,
  normalizePhone,
} from '../utils/recipient-validator.util';
import { AudienceId } from '../types/audience.types';
import { NotificationType } from '../enums/notification-type.enum';
import {
  validateRecipients,
  ValidatedRecipientInfo,
} from '../validation/recipient-info.schema';
import { InvalidRecipientException } from '../exceptions/invalid-recipient.exception';
import {
  CONCURRENCY_CONSTANTS,
  QUEUE_CONSTANTS,
  STRING_CONSTANTS,
} from '../constants/notification.constants';
import { NotificationPipelineService, NotificationProcessingContext } from './pipeline/notification-pipeline.service';
import { NotificationRouterService } from './routing/notification-router.service';
import { BulkNotificationResult } from '../types/bulk-notification-result.interface';

// NotificationProcessingContext is imported from pipeline service

@Injectable()
export class NotificationService {
  // Initialize p-limit once per service instance (not per method call)
  // This ensures optimal performance by reusing the limiter across all trigger calls
  private readonly concurrencyLimit = pLimit(CONCURRENCY_CONSTANTS.DEFAULT_CONCURRENCY_LIMIT);
  // Concurrency limit constant for logging (p-limit doesn't expose limit value)
  private static readonly CONCURRENCY_LIMIT = CONCURRENCY_CONSTANTS.DEFAULT_CONCURRENCY_LIMIT;

  constructor(
    @InjectQueue('notifications') private readonly queue: Queue,
    private readonly senderService: NotificationSenderService,
    private readonly channelSelectionService: ChannelSelectionService,
    private readonly templateService: NotificationTemplateService,
    private readonly inAppNotificationService: InAppNotificationService,
    private readonly logger: LoggerService,
    private readonly retryStrategyService: ChannelRetryStrategyService,
    private readonly manifestResolver: NotificationManifestResolver,
    private readonly renderer: NotificationRenderer,
    private readonly pipelineService: NotificationPipelineService,
    private readonly routerService: NotificationRouterService,
    private readonly metricsService?: NotificationMetricsService,
    private readonly idempotencyCache?: NotificationIdempotencyCacheService,
  ) {}

  /**
   * @deprecated This method has been moved to NotificationRouterService.enqueueNotifications()
   * Kept temporarily for backward compatibility but is no longer used.
   */
  async enqueueNotifications(
    payloads: NotificationPayload[],
    priority: number = 0,
  ): Promise<Job<NotificationJobData>[]> {
    // Delegate to router service
    return this.routerService.enqueueNotifications(payloads, priority);
  }

  /**
   * Process event for a single recipient
   * Used by trigger() method for processing notifications
   *
   * @param notificationType - Notification type
   * @param event - Event object containing notification data (remains immutable)
   * @param correlationId - Correlation ID for request tracing
   * @param recipientInfo - Required recipient info with all necessary data
   * @param manifest - Notification manifest (required)
   * @param audience - Audience identifier (required for multi-audience manifests)
   * @param channels - Optional array of channels to use. If provided, only these channels will be used.
   * @param preRenderedCache - Optional cache of pre-rendered templates (for bulk optimization)
   */
  private async processEventForRecipient(
    notificationType: NotificationType,
    event: NotificationEvent | Record<string, unknown>,
    correlationId: string,
    recipientInfo: RecipientInfo,
    manifest: NotificationManifest,
    audience: AudienceId,
    channels?: NotificationChannel[],
    preRenderedCache?: Map<string, RenderedNotification>,
  ): Promise<void> {
    // Initialize processing context
    const context: NotificationProcessingContext = {
      eventName: notificationType,
      event,
      correlationId,
      requestedChannels: channels,
      audience,
      manifest,
      mapping: { type: notificationType }, // Simple mapping for compatibility
      enabledChannels: [],
      finalChannels: [],
      recipient: '',
      locale: 'en',
      templateData: {} as NotificationTemplateData,
    };

    // Execute pipeline steps using pipeline service
    await this.pipelineService.process(context, recipientInfo);
    
    if (context.enabledChannels && context.enabledChannels.length === 0) {
      return; // Early exit if no enabled channels
    }

    // Route to channels using router service
    await this.routerService.route(context, preRenderedCache);
  }

  /**
   * Deduplicate recipients by userId to ensure each user receives only one notification
   * Even if they appear multiple times (e.g., multiple roles)
   */
  private deduplicateRecipients(recipients: RecipientInfo[]): RecipientInfo[] {
    const seen = new Set<string>();
    return recipients.filter((recipient) => {
      if (seen.has(recipient.userId)) {
        return false;
      }
      seen.add(recipient.userId);
      return true;
    });
  }

  /**
   * Trigger a notification with audience specification
   * This is the preferred method for sending notifications with multi-audience support
   *
   * @param type - Notification type
   * @param options - Trigger options including audience, event, recipients, and optional channels
   * @returns Detailed result of the bulk notification operation
   */
  async trigger(
    type: NotificationType,
    options: {
      audience: AudienceId;
      event: NotificationEvent | Record<string, unknown>;
      recipients: RecipientInfo[];
      channels?: NotificationChannel[];
    },
  ): Promise<BulkNotificationResult> {
    const { audience, event, recipients, channels } = options;
    const startTime = Date.now();

    // Initialize result object
    const result: BulkNotificationResult = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0,
      correlationId: '',
    };

    // Get manifest
    const manifest = this.manifestResolver.getManifest(type);

    // Validate audience exists
    this.manifestResolver.getAudienceConfig(manifest, audience);

    // Extract or generate correlation ID
    const requestContext = RequestContext.get();
    const correlationId = requestContext?.requestId || randomUUID();
    result.correlationId = correlationId;

    // Validate all recipients before processing
    const validationResult = validateRecipients(recipients);
    
    if (validationResult.errors.length > 0) {
      // Log validation errors
      for (const error of validationResult.errors) {
        const recipient = recipients[error.index];
        const errorMessages = error.errors.errors.map((e) => e.message).join('; ');
        
        result.errors.push({
          recipient: recipient?.userId || `index-${error.index}`,
          error: errorMessages,
          code: 'VALIDATION_ERROR',
        });
        
        this.logger.error(
          `Invalid recipient at index ${error.index}`,
          undefined,
          'NotificationService',
          {
            notificationType: type,
            audience,
            correlationId,
            validationErrors: error.errors.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        );
      }

      // Update skipped count for validation errors
      result.skipped = validationResult.errors.length;

      // Throw exception with all validation errors
      const allErrors = validationResult.errors.flatMap((e) =>
        e.errors.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      );
      throw InvalidRecipientException.fromZodError({
        issues: allErrors.map((e) => ({
          path: e.field.split('.'),
          message: e.message,
        })),
      });
    }

    // Process each recipient
    if (validationResult.valid.length > 0) {
      const uniqueRecipients = this.deduplicateRecipients(
        validationResult.valid as RecipientInfo[],
      );

      if (uniqueRecipients.length === 0) {
        this.logger.warn(
          `No valid recipients after deduplication for notification: ${type}`,
          'NotificationService',
          {
            notificationType: type,
            audience,
            correlationId,
            originalCount: recipients.length,
            validatedCount: validationResult.valid.length,
          },
        );
        result.skipped = result.total;
        result.duration = Date.now() - startTime;
        return result;
      }

      logNotificationStart(this.logger, {
        eventName: type,
        correlationId,
        recipientCount: uniqueRecipients.length,
        concurrencyLimit: NotificationService.CONCURRENCY_LIMIT,
      });

      // Bulk rendering optimization: Group recipients by template data hash
      // and pre-render templates once per group
      const preRenderedCache = new Map<string, RenderedNotification>();
      
      // Group recipients by template data hash (same template data = same rendered content)
      const recipientGroups = this.groupRecipientsByTemplateData(
        uniqueRecipients,
        type,
        event,
        manifest,
        audience,
        channels,
      );

      // Pre-render templates for each group (only if group has multiple recipients)
      for (const group of recipientGroups) {
        if (group.recipients.length > 1) {
          // Multiple recipients with same template data - render once
          await this.preRenderTemplatesForGroup(
            group,
            type,
            event,
            manifest,
            audience,
            preRenderedCache,
            correlationId,
          );
        }
        // If group has only 1 recipient, render on-demand (no optimization needed)
      }

      const results = await Promise.allSettled(
        uniqueRecipients.map((recipient) =>
          this.concurrencyLimit(async () => {
            try {
              await this.processEventForRecipient(
                type,
                event,
                correlationId,
                recipient,
                manifest,
                audience,
                channels,
                preRenderedCache, // Pass cache for reuse
              );
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              const errorCode = error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR';
              
              result.errors.push({
                recipient: recipient.userId,
                error: errorMessage,
                code: errorCode,
              });
              
              logNotificationError(
                this.logger,
                {
                  eventName: type,
                  correlationId,
                  recipientId: recipient.userId,
                  profileId: recipient.profileId ?? undefined,
                  profileType: recipient.profileType ?? undefined,
                  error: errorMessage,
                },
                error instanceof Error ? error : undefined,
              );
              throw error;
            }
          }),
        ),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failureCount = results.filter(
        (r) => r.status === 'rejected',
      ).length;
      
      // Update result object
      result.sent = successCount;
      result.failed = failureCount;
      result.duration = duration;
      
      logNotificationComplete(this.logger, {
        eventName: type,
        correlationId,
        duration,
        successCount,
        failureCount,
        recipientCount: uniqueRecipients.length,
        concurrencyLimit: NotificationService.CONCURRENCY_LIMIT,
      });
    } else {
      // No valid recipients
      result.skipped = result.total;
      result.duration = Date.now() - startTime;
    }
    
    return result;
  }

  /**
   * NOTE: The following methods have been moved to dedicated services:
   * - extractEventData, determineChannels, selectOptimalChannels, prepareTemplateData -> NotificationPipelineService
   * - routeToChannels, determineAndValidateRecipient, checkIdempotency, buildBasePayload, buildPayload, sendOrEnqueueNotification, enqueueJob, enqueueNotifications -> NotificationRouterService
   * 
   * These methods are kept here temporarily for reference but are no longer used.
   * They will be removed in a future cleanup.
   */

  /**
   * Pipeline Step 7 & 8: Route notifications to channels (IN_APP direct send, others enqueue)
   * @deprecated This method has been moved to NotificationRouterService.route()
   * @param context - Processing context
   * @param preRenderedCache - Optional cache of pre-rendered templates (for bulk optimization)
   */
  private async routeToChannels(
    context: Partial<NotificationProcessingContext>,
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
    } = context;

    if (
      !finalChannels ||
      !mapping ||
      !manifest ||
      !templateData ||
      !locale ||
      !userId ||
      !eventName ||
      !context.correlationId
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
      const { audience } = context;
      if (audience) {
        try {
          // Validate channel exists for this audience
          this.manifestResolver.getChannelConfig(manifest, audience, channel);
        } catch {
          this.logger.error(
            `Channel ${channel} not supported for audience ${audience} in notification type ${mapping.type}`,
            undefined,
            'NotificationService',
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
            undefined,
            'NotificationService',
            {
              notificationType: mapping.type,
              channel,
              eventName,
            },
          );
          continue;
        }
      }

      // Determine and validate recipient for this channel
      const channelRecipient = await this.determineAndValidateRecipient(
        channel,
        recipient,
        phone,
        userId,
        eventName,
        mapping.type,
      );

      if (!channelRecipient) {
        continue; // Recipient validation failed or skipped
      }

      // Check idempotency with distributed lock
      const idempotencyResult = await this.checkIdempotency(
        context,
        mapping.type,
        channel,
        channelRecipient,
      );

      if (!idempotencyResult.shouldProceed) {
        continue; // Already sent or lock failed
      }

      // Build base payload
      const basePayload = this.buildBasePayload(
        channelRecipient,
        channel,
        mapping,
        manifest,
        locale,
        centerId,
        userId,
        profileType,
        profileId,
        context.correlationId,
      );

      // Render template and build payload (use cache if available for bulk optimization)
      let rendered: RenderedNotification;
      const cacheKey = this.getTemplateCacheKey(
        mapping.type,
        channel,
        locale,
        templateData as Record<string, unknown>,
        context.audience,
      );

      if (preRenderedCache && preRenderedCache.has(cacheKey)) {
        // Use pre-rendered content from cache (bulk optimization)
        rendered = preRenderedCache.get(cacheKey)!;
        this.logger.debug(
          `Using pre-rendered template from cache: ${cacheKey}`,
          'NotificationService',
          {
            notificationType: mapping.type,
            channel,
            locale,
          },
        );
      } else {
        // Render template (normal flow or cache miss)
        rendered = await this.renderer.render(
          mapping.type,
          channel,
          templateData as Record<string, unknown>,
          locale,
          context.audience,
        );
        // Store in cache if provided
        if (preRenderedCache) {
          preRenderedCache.set(cacheKey, rendered);
        }
      }

      const payload = this.buildPayload(
        channel,
        basePayload,
        rendered,
        templateData,
        manifest,
      );

      if (!payload) {
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
            context.correlationId,
            priority,
          );
        } finally {
          // Release idempotency lock if acquired
          if (
            idempotencyResult.lockAcquired &&
            this.idempotencyCache &&
            context.correlationId
          ) {
            await this.idempotencyCache.releaseLock(
              context.correlationId,
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
          context.correlationId
        ) {
          locksToRelease.push({
            correlationId: context.correlationId,
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
        this.logger.debug(
          `Bulk enqueued ${payloadsToEnqueue.length} notification(s) for user ${userId}`,
          'NotificationService',
          {
            eventName,
            userId,
            correlationId: context.correlationId,
            channelCount: payloadsToEnqueue.length,
            channels: payloadsToEnqueue.map((p) => p.channel),
          },
        );

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
          error instanceof Error ? error.stack : undefined,
          'NotificationService',
          {
            eventName,
            userId,
            correlationId: context.correlationId,
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
   * Determine recipient for a channel and validate format
   * Ensures each channel stores the correct recipient type:
   * - EMAIL: email address
   * - SMS/WHATSAPP: phone number
   * - IN_APP: userId
   * @returns Validated recipient string or null if invalid/missing
   */
  private async determineAndValidateRecipient(
    channel: NotificationChannel,
    recipient: string | undefined,
    phone: string | undefined,
    userId: string,
    eventName: NotificationType,
    notificationType: NotificationType,
  ): Promise<string | null> {
    let channelRecipient: string | null = null;

    // Determine recipient based on channel type
    if (channel === NotificationChannel.EMAIL) {
      const email = recipient?.includes('@') ? recipient : null;
      if (!email) {
        this.logger.debug(
          `Skipping EMAIL channel: no email for user ${userId}`,
          'NotificationService',
          { userId, eventName },
        );
        return null;
      }
      channelRecipient = email;
    } else if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      // For SMS/WhatsApp, MUST use phone, never fallback to recipient or userId
      if (!phone) {
        this.logger.warn(
          `Skipping ${channel} channel: no phone for user ${userId}`,
          'NotificationService',
          { userId, eventName, channel },
        );
        return null;
      }
      // Validate phone is actually a phone number (not userId or email)
      if (phone === userId || phone.includes('@')) {
        this.logger.error(
          `Invalid phone value for ${channel} channel: phone appears to be userId or email`,
          undefined,
          'NotificationService',
          {
            userId,
            eventName,
            channel,
            phone: phone.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH),
          },
        );
        return null;
      }
      channelRecipient = phone;
    } else if (channel === NotificationChannel.IN_APP) {
      // For IN_APP, use userId as recipient
      channelRecipient = userId || '';
    } else {
      // PUSH or other channels - use appropriate fallback
      channelRecipient = recipient || phone || null;
    }

    if (!channelRecipient) {
      this.logger.debug(
        `Skipping ${channel} channel: no recipient data`,
        'NotificationService',
        { userId, eventName, channel },
      );
      return null;
    }

    // Validate recipient format
    if (channel === NotificationChannel.EMAIL) {
      if (!isValidEmail(channelRecipient)) {
        this.logger.warn(
          `Invalid email format for ${channel} channel: ${channelRecipient.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH)}`,
          'NotificationService',
          {
            userId,
            eventName,
            channel,
            recipient: channelRecipient.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH),
          },
        );
        if (this.metricsService) {
          await this.metricsService.incrementFailed(channel, notificationType);
        }
        return null;
      }
    } else if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      // Normalize and validate phone format
      const normalizedPhone = normalizePhone(channelRecipient);
      if (!normalizedPhone || !isValidE164(normalizedPhone)) {
        this.logger.warn(
          `Invalid phone format for ${channel} channel: ${channelRecipient.substring(0, 20)}`,
          'NotificationService',
          {
            userId,
            eventName,
            channel,
            recipient: channelRecipient.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH),
          },
        );
        if (this.metricsService) {
          await this.metricsService.incrementFailed(channel, notificationType);
        }
        return null;
      }
      channelRecipient = normalizedPhone;
    }

    return channelRecipient;
  }

  /**
   * Check idempotency with distributed lock
   * @returns Object with shouldProceed flag and lockAcquired flag
   */
  private async checkIdempotency(
    context: Partial<NotificationProcessingContext>,
    notificationType: NotificationType,
    channel: NotificationChannel,
    channelRecipient: string,
  ): Promise<{ shouldProceed: boolean; lockAcquired: boolean }> {
    const type = notificationType;
    if (!this.idempotencyCache || !context.correlationId) {
      return { shouldProceed: true, lockAcquired: false };
    }

    let lockAcquired = false;
    try {
      lockAcquired = await this.idempotencyCache.acquireLock(
        context.correlationId,
        type,
        channel,
        channelRecipient,
      );

      if (!lockAcquired) {
        this.logger.debug(
          `Skipping notification (lock not acquired): ${notificationType}:${channel}`,
          'NotificationService',
          {
            correlationId: context.correlationId,
            type: notificationType,
            channel,
            recipient: channelRecipient.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH),
          },
        );
        return { shouldProceed: false, lockAcquired: false };
      }

      const alreadySent = await this.idempotencyCache.checkAndSet(
        context.correlationId,
        type,
        channel,
        channelRecipient,
      );

      if (alreadySent) {
        await this.idempotencyCache.releaseLock(
          context.correlationId,
          type,
          channel,
          channelRecipient,
        );
        this.logger.debug(
          `Skipping duplicate notification (idempotency): ${notificationType}:${channel}`,
          'NotificationService',
          {
            correlationId: context.correlationId,
            type: notificationType,
            channel,
            recipient: channelRecipient.substring(0, STRING_CONSTANTS.MAX_LOGGED_RECIPIENT_LENGTH),
          },
        );
        return { shouldProceed: false, lockAcquired: false };
      }

      return { shouldProceed: true, lockAcquired: true };
    } catch (error) {
      if (lockAcquired) {
        await this.idempotencyCache.releaseLock(
          context.correlationId,
          type,
          channel,
          channelRecipient,
        );
      }
      this.logger.warn(
        `Idempotency check failed, proceeding anyway: ${notificationType}:${channel}`,
        'NotificationService',
        {
          correlationId: context.correlationId,
          type: notificationType,
          channel,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return { shouldProceed: true, lockAcquired: false };
    }
  }

  /**
   * Build base payload with common fields
   * Note: channelRecipient is already validated and channel-specific:
   * - EMAIL: email address
   * - SMS/WHATSAPP: phone number (E164 format)
   * - IN_APP: userId
   * - PUSH: device token or appropriate identifier
   */
  private buildBasePayload(
    channelRecipient: string,
    channel: NotificationChannel,
    mapping: { type: NotificationType },
    manifest: NotificationManifest,
    locale: string,
    centerId: string | undefined,
    userId: string,
    profileType: ProfileType | null | undefined,
    profileId: string | null | undefined,
    correlationId: string,
  ) {
    return {
      recipient: channelRecipient, // Channel-specific recipient (validated in determineAndValidateRecipient)
      channel,
      type: mapping.type,
      group: manifest.group,
      locale,
      centerId,
      userId: createUserId(userId),
      profileType: profileType ?? null,
      profileId: profileId ?? null,
      correlationId: createCorrelationId(correlationId),
    };
  }

  /**
   * Build channel-specific payload from rendered content
   */
  private buildPayload(
    channel: NotificationChannel,
    basePayload: ReturnType<typeof this.buildBasePayload>,
    rendered: {
      subject?: string;
      content: string | object;
      metadata: { template: string };
    },
    templateData: NotificationTemplateData,
    manifest: NotificationManifest,
  ): NotificationPayload | null {
    if (channel === NotificationChannel.EMAIL) {
      if (!rendered.subject) {
        this.logger.error(
          `Email subject missing for ${basePayload.type}`,
          undefined,
          'NotificationService',
          { notificationType: basePayload.type, channel },
        );
        return null;
      }
      return {
        ...basePayload,
        channel: NotificationChannel.EMAIL,
        subject: rendered.subject,
        data: {
          html: rendered.content as string,
          content: rendered.content as string,
          ...templateData,
          template: rendered.metadata.template,
        },
      } as NotificationPayload;
    }

    if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      return {
        ...basePayload,
        channel,
        data: {
          content: rendered.content as string,
          message: rendered.content as string,
          html: rendered.content as string,
          ...templateData,
          template: rendered.metadata.template,
        },
      } as NotificationPayload;
    }

    if (channel === NotificationChannel.IN_APP) {
      const inAppContent =
        typeof rendered.content === 'object'
          ? rendered.content
          : { message: rendered.content };
      return {
        ...basePayload,
        channel: NotificationChannel.IN_APP,
        title:
          (inAppContent as Record<string, unknown>).title ||
          (templateData as Record<string, unknown>).title ||
          'Notification',
        data: {
          message:
            (inAppContent as Record<string, unknown>).message ||
            (typeof rendered.content === 'string'
              ? rendered.content
              : JSON.stringify(rendered.content)),
          priority: manifest.priority ?? 0,
          expiresAt: (inAppContent as Record<string, unknown>).expiresAt
            ? new Date(
                (inAppContent as Record<string, unknown>).expiresAt as string,
              )
            : undefined,
          ...templateData,
          ...(typeof rendered.content === 'object' ? rendered.content : {}),
        },
      } as NotificationPayload;
    }

    if (channel === NotificationChannel.PUSH) {
      return {
        ...basePayload,
        channel: NotificationChannel.PUSH,
        title:
          typeof templateData === 'object' &&
          templateData !== null &&
          'title' in templateData &&
          typeof templateData.title === 'string'
            ? templateData.title
            : 'Notification',
        data: {
          ...templateData,
          content: rendered.content,
          message: rendered.content,
          template: rendered.metadata.template,
        },
      } as NotificationPayload;
    }

    // Fallback for other channels (should not happen for known channels)
    // Build a safe payload based on channel type
    const fallbackPayload = {
      ...basePayload,
      channel,
      recipient: basePayload.recipient || '',
      data: {
        ...templateData,
        content: typeof rendered.content === 'string' ? rendered.content : String(rendered.content),
        template: rendered.metadata.template,
      },
    };

    // Add channel-specific required fields
    if (channel === NotificationChannel.EMAIL) {
      return {
        ...fallbackPayload,
        subject: typeof templateData.title === 'string' ? templateData.title : 'Notification',
        data: {
          ...fallbackPayload.data,
          html: typeof rendered.content === 'string' ? rendered.content : String(rendered.content),
        },
      } as EmailNotificationPayload;
    } else if (channel === NotificationChannel.PUSH || channel === NotificationChannel.IN_APP) {
      return {
        ...fallbackPayload,
        title: typeof templateData.title === 'string' ? templateData.title : 'Notification',
        data: {
          ...fallbackPayload.data,
          message: typeof rendered.content === 'string' ? rendered.content : String(rendered.content),
        },
      } as PushNotificationPayload | InAppNotificationPayload;
    } else {
      // SMS or WhatsApp
      return {
        ...fallbackPayload,
        data: {
          ...fallbackPayload.data,
          content: typeof rendered.content === 'string' ? rendered.content : String(rendered.content),
        },
      } as SmsNotificationPayload | WhatsAppNotificationPayload;
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
      // Check rate limit for IN_APP
      const userWithinLimit =
        await this.inAppNotificationService.checkUserRateLimit(userId);
      if (!userWithinLimit) {
        const rateLimitConfig =
          this.inAppNotificationService.getRateLimitConfig();
        this.logger.warn(
          `User ${userId} exceeded rate limit (${rateLimitConfig.limit}/${rateLimitConfig.windowSeconds}s) for IN_APP notification, skipping delivery`,
          'NotificationService',
          {
            userId,
            eventName,
            limit: rateLimitConfig.limit,
            window: `${rateLimitConfig.windowSeconds} seconds`,
          },
        );
        return;
      }

      // Send directly without queuing for low latency
      try {
        await this.senderService.send(payload);
        this.logger.debug(
          `IN_APP notification sent directly (skipped queue): ${eventName} to user ${userId}`,
          'NotificationService',
          {
            eventName,
            userId,
            correlationId,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to send IN_APP notification directly: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
          'NotificationService',
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
   * Uses channel-specific retry strategies for optimal retry behavior
   * @param payload - Notification payload
   * @param priority - Job priority (higher = processed first)
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
      priority, // Higher priority = processed first
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
   * Group recipients by template data hash for bulk rendering optimization
   * Recipients with the same template data (excluding recipient-specific fields) are grouped together
   */
  private groupRecipientsByTemplateData(
    recipients: RecipientInfo[],
    notificationType: NotificationType,
    event: NotificationEvent | Record<string, unknown>,
    manifest: NotificationManifest,
    audience: AudienceId,
    channels?: NotificationChannel[],
  ): Array<{ templateDataHash: string; recipients: RecipientInfo[] }> {
    const groups = new Map<string, RecipientInfo[]>();

    for (const recipient of recipients) {
      // Create template data hash (excluding recipient-specific fields)
      const templateData = this.prepareTemplateDataForHash(
        event,
        recipient,
        manifest,
      );
      const hash = this.hashTemplateData(
        notificationType,
        recipient.locale,
        templateData,
        audience,
      );

      if (!groups.has(hash)) {
        groups.set(hash, []);
      }
      groups.get(hash)!.push(recipient);
    }

    return Array.from(groups.entries()).map(([templateDataHash, recipients]) => ({
      templateDataHash,
      recipients,
    }));
  }

  /**
   * Prepare template data for hashing (exclude recipient-specific fields)
   */
  private prepareTemplateDataForHash(
    event: NotificationEvent | Record<string, unknown>,
    recipient: RecipientInfo,
    manifest: NotificationManifest,
  ): Record<string, unknown> {
    // Clone event data and exclude recipient-specific fields
    const eventData = { ...(event as Record<string, unknown>) };
    
    // Remove recipient-specific fields that don't affect template rendering
    // These fields are added per-recipient in buildBasePayload
    delete eventData.userId;
    delete eventData.recipient;
    delete eventData.phone;
    delete eventData.centerId;
    delete eventData.profileId;
    delete eventData.profileType;
    delete eventData.locale; // Locale is part of hash, not template data

    // Add priority for IN_APP (from manifest)
    if (manifest.priority !== undefined) {
      eventData.priority = manifest.priority;
    }

    return eventData;
  }

  /**
   * Hash template data to create cache key for bulk rendering
   */
  private hashTemplateData(
    notificationType: NotificationType,
    locale: string,
    templateData: Record<string, unknown>,
    audience?: AudienceId,
  ): string {
    // Create stable hash from template data (excluding recipient-specific fields)
    const hashInput = JSON.stringify({
      type: notificationType,
      locale,
      audience,
      data: templateData,
    });

    // Use SHA-256 for consistent hashing
    return createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  }

  /**
   * Get cache key for pre-rendered template
   */
  private getTemplateCacheKey(
    notificationType: NotificationType,
    channel: NotificationChannel,
    locale: string,
    templateData: Record<string, unknown>,
    audience?: AudienceId,
  ): string {
    // Create hash excluding recipient-specific fields
    const dataForHash = { ...templateData };
    delete dataForHash.userId;
    delete dataForHash.recipient;
    delete dataForHash.phone;
    delete dataForHash.centerId;
    delete dataForHash.profileId;
    delete dataForHash.profileType;

    const hash = this.hashTemplateData(notificationType, locale, dataForHash, audience);
    return `${notificationType}:${channel}:${locale}:${hash}`;
  }

  /**
   * Pre-render templates for a group of recipients with the same template data
   * This is the key optimization: render once, reuse for all recipients in the group
   */
  private async preRenderTemplatesForGroup(
    group: { templateDataHash: string; recipients: RecipientInfo[] },
    notificationType: NotificationType,
    event: NotificationEvent | Record<string, unknown>,
    manifest: NotificationManifest,
    audience: AudienceId,
    cache: Map<string, RenderedNotification>,
    correlationId: string,
  ): Promise<void> {
    if (group.recipients.length === 0) {
      return;
    }

    // Use first recipient as representative (all have same template data)
    const representative = group.recipients[0];
    const templateData = this.prepareTemplateDataForHash(
      event,
      representative,
      manifest,
    );

    // Get all channels from manifest for this audience
    const audienceConfig = this.manifestResolver.getAudienceConfig(manifest, audience);
    const availableChannels = Object.keys(audienceConfig.channels) as NotificationChannel[];

    // Pre-render for each channel and locale combination
    const locales = new Set(group.recipients.map((r) => r.locale));

    for (const channel of availableChannels) {
      for (const locale of locales) {
        try {
          const cacheKey = this.getTemplateCacheKey(
            notificationType,
            channel,
            locale,
            templateData,
            audience,
          );

          // Only render if not already cached
          if (!cache.has(cacheKey)) {
            // Render template once for this group
            const rendered = await this.renderer.render(
              notificationType,
              channel,
              templateData,
              locale,
              audience,
            );
            cache.set(cacheKey, rendered);
            this.logger.debug(
              `Pre-rendered template for bulk group: ${cacheKey}`,
              'NotificationService',
              {
                notificationType,
                channel,
                locale,
                groupSize: group.recipients.length,
                correlationId,
              },
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to pre-render template for group: ${group.templateDataHash}`,
            'NotificationService',
            {
              error: error instanceof Error ? error.message : String(error),
              channel,
              locale,
              correlationId,
            },
          );
          // Continue with other channels/locales - don't fail entire group
        }
      }
    }
  }
}
