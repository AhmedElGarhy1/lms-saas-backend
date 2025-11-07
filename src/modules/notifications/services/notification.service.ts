import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { NotificationJobData } from '../types/notification-job-data.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationPayload } from '../types/notification-payload.interface';
import { NotificationSenderService } from './notification-sender.service';
import { ChannelSelectionService } from './channel-selection.service';
import { NotificationTemplateService } from './notification-template.service';
import { InAppNotificationService } from './in-app-notification.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ChannelRetryStrategyService } from './channel-retry-strategy.service';
import {
  NotificationEventsMap,
  DEFAULT_NOTIFICATION_MAPPING,
  getUnmappedEventLogLevel,
  NotificationEventMapping,
} from '../config/notifications.map';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationManifest } from '../manifests/types/manifest.types';
import { generateDefaultManifest } from '../manifests/default-manifest.generator';
import { NotificationRenderer } from '../renderer/notification-renderer.service';
import { NotificationIdempotencyCacheService } from './notification-idempotency-cache.service';
import { EventType } from '@/shared/events';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RequestContext } from '@/shared/common/context/request.context';
import { randomUUID } from 'crypto';
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

/**
 * Context object passed through the notification processing pipeline
 *
 * Fields are populated sequentially as the pipeline progresses:
 * 1. lookupMapping: eventName, event, mapping, manifest, correlationId
 * 2. extractEventData: userId, recipient, phone, centerId, locale, profileType, profileId
 * 3. determineChannels: enabledChannels (from manifest)
 * 4. selectOptimalChannels: finalChannels (optimized based on user activity)
 * 5. prepareTemplateData: templateData
 * 6. routeToChannels: uses finalChannels, templateData, manifest
 */
interface NotificationProcessingContext {
  // Event and mapping
  eventName: EventType | string;
  event: NotificationEvent | Record<string, unknown>;
  mapping: NotificationEventMapping; // EventType → NotificationType mapping
  manifest: NotificationManifest; // Single source of truth for all config
  correlationId: string;

  // Recipient information
  userId?: string;
  recipient: string; // Email or phone (for backward compat and logging)
  phone?: string; // Phone number for SMS/WhatsApp routing
  centerId?: string;
  locale: string;
  profileType?: ProfileType | null;
  profileId?: string | null;

  // Channel selection (progressive refinement)
  enabledChannels: NotificationChannel[]; // Channels from manifest (after preferences check)
  finalChannels: NotificationChannel[]; // Optimized channels (after activity-based selection)

  // Template data
  templateData: NotificationTemplateData;
}

@Injectable()
export class NotificationService {
  // Initialize p-limit once per service instance (not per method call)
  // This ensures optimal performance by reusing the limiter across all processEvent calls
  private readonly concurrencyLimit = pLimit(20);
  // Concurrency limit constant for logging (p-limit doesn't expose limit value)
  private static readonly CONCURRENCY_LIMIT = 20;

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
    private readonly metricsService?: NotificationMetricsService,
    private readonly idempotencyCache?: NotificationIdempotencyCacheService,
  ) {}

  /**
   * Enqueue multiple notifications
   */
  async enqueueNotifications(payloads: NotificationPayload[]): Promise<void> {
    await Promise.all(payloads.map((payload) => this.enqueueJob(payload, 0)));
  }

  /**
   * Process a domain event and orchestrate notification delivery
   *
   * Orchestration pipeline:
   * 1. Lookup notification mapping from NotificationEventsMap (with fallback to DEFAULT_NOTIFICATION_MAPPING)
   * 2. Extract recipient, userId, centerId, locale, profileInfo from event data or RecipientInfo
   * 3. Determine channels based on manifest (all users get same channels)
   * 4. Check user preferences for each channel (parallelized)
   * 5. Apply dynamic channel selection based on user activity and urgency
   * 6. Prepare template data with defaults and IN_APP-specific fields
   * 7. For IN_APP: Check rate limit, send directly via NotificationSenderService
   * 8. For other channels: Enqueue via BullMQ queue
   *
   * Edge cases handled:
   * - Missing userId: Assumes enabled for system notifications
   * - Channels: Loaded from manifest (all users get same channels)
   * - Unmapped events: Uses DEFAULT_NOTIFICATION_MAPPING with severity-based logging
   * - Rate limit exceeded: Skips IN_APP delivery, continues with other channels
   *
   * Multi-recipient support:
   * - If recipients array is provided, process each recipient through the pipeline
   * - Use concurrency limiting to prevent event loop pressure
   * - Deduplicate recipients by userId before processing
   * - Track metrics for multi-recipient notifications
   * - Events remain immutable - recipient info passed explicitly
   *
   * @param eventName - Event type (EventType enum or string)
   * @param event - Event object containing notification data (remains immutable)
   * @param recipients - Optional array of recipients to notify (for multi-recipient events)
   */
  async processEvent(
    eventName: EventType,
    event: NotificationEvent,
    recipients: RecipientInfo[],
  ): Promise<void> {
    // Extract or generate correlation ID for request tracing
    const requestContext = RequestContext.get();
    const correlationId = requestContext?.requestId || randomUUID();

    // Process each recipient
    if (recipients.length > 0) {
      // Deduplicate recipients by userId (final safety check)
      const uniqueRecipients = this.deduplicateRecipients(recipients);

      // Validate after deduplication: ensure at least one recipient remains
      if (uniqueRecipients.length === 0) {
        this.logger.warn(
          `No valid recipients after deduplication for event: ${eventName}`,
          'NotificationService',
          {
            eventName,
            correlationId,
            originalCount: recipients.length,
          },
        );
        return;
      }

      const startTime = Date.now();

      // Log structured metrics at start
      logNotificationStart(this.logger, {
        eventName,
        correlationId,
        recipientCount: uniqueRecipients.length,
        concurrencyLimit: NotificationService.CONCURRENCY_LIMIT,
        centerId: uniqueRecipients[0]?.centerId ?? undefined,
      });

      // Track metrics
      if (this.metricsService) {
        // Note: metricsService doesn't have increment method that takes custom tags
        // We'll log the metric differently or extend the service later
        this.logger.debug(
          `Multi-recipient notification: ${uniqueRecipients.length} recipients for ${eventName}`,
          'NotificationService',
        );
      }

      // Process with concurrency limit
      const results = await Promise.allSettled(
        uniqueRecipients.map((recipient) =>
          this.concurrencyLimit(async () => {
            try {
              // Pass recipient info explicitly - event remains immutable
              await this.processEventForRecipient(
                eventName,
                event,
                correlationId,
                recipient,
              );
            } catch (error) {
              // Enhanced error logging with profile information
              logNotificationError(
                this.logger,
                {
                  eventName,
                  correlationId,
                  recipientId: recipient.userId,
                  profileId: recipient.profileId ?? undefined,
                  profileType: recipient.profileType ?? undefined,
                  error: error instanceof Error ? error.message : String(error),
                },
                error instanceof Error ? error : undefined,
              );
              throw error; // Re-throw to be caught by Promise.allSettled
            }
          }),
        ),
      );

      // Log summary with timing metrics
      const endTime = Date.now();
      const duration = endTime - startTime;
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failureCount = results.filter(
        (r) => r.status === 'rejected',
      ).length;
      logNotificationComplete(this.logger, {
        eventName,
        correlationId,
        duration,
        successCount,
        failureCount,
        recipientCount: uniqueRecipients.length,
        concurrencyLimit: NotificationService.CONCURRENCY_LIMIT,
      });
    }
  }

  /**
   * Process event for a single recipient
   * Extracted from processEvent to avoid code duplication
   *
   * @param eventName - Event type (EventType enum or string)
   * @param event - Event object containing notification data (remains immutable)
   * @param correlationId - Correlation ID for request tracing
   * @param recipientInfo - Required recipient info with all necessary data
   */
  private async processEventForRecipient(
    eventName: EventType | string,
    event: NotificationEvent | Record<string, unknown>,
    correlationId: string,
    recipientInfo: RecipientInfo,
  ): Promise<void> {
    // Initialize processing context
    const context: Partial<NotificationProcessingContext> = {
      eventName,
      event,
      correlationId,
    };

    // Execute pipeline steps sequentially
    this.lookupMapping(context);
    this.extractEventData(context, recipientInfo);
    this.determineChannels(context);
    if (context.enabledChannels && context.enabledChannels.length === 0) {
      return; // Early exit if no enabled channels
    }
    await this.selectOptimalChannels(context);
    this.prepareTemplateData(context);
    await this.routeToChannels(context);
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
   * Pipeline Step 1: Lookup notification mapping and load manifest
   */
  private lookupMapping(context: Partial<NotificationProcessingContext>): void {
    const { eventName } = context;
    let mapping = NotificationEventsMap[eventName as EventType];
    if (!mapping) {
      // Use default mapping for unmapped events
      const { logLevel, priority } = getUnmappedEventLogLevel(eventName!);
      const logMessage = `No notification mapping found for event: ${eventName}, using default mapping`;

      if (logLevel === 'error') {
        this.logger.error(logMessage, undefined, 'NotificationService', {
          eventName,
          logLevel,
          priority,
          correlationId: context.correlationId,
        });
      } else if (logLevel === 'warn') {
        this.logger.warn(logMessage, 'NotificationService', {
          eventName,
          logLevel,
          priority,
          correlationId: context.correlationId,
        });
      } else {
        this.logger.log(logMessage, 'NotificationService', {
          eventName,
          logLevel,
          priority,
          correlationId: context.correlationId,
        });
      }

      mapping = DEFAULT_NOTIFICATION_MAPPING;
    }

    context.mapping = mapping;

    // Load manifest - single source of truth for all config
    try {
      const manifest = this.manifestResolver.getManifest(mapping.type);
      context.manifest = manifest;
    } catch {
      // Generate default manifest as fallback
      const defaultManifest = generateDefaultManifest(mapping.type);
      context.manifest = defaultManifest;

      // Log warning with full context
      this.logger.warn(
        `NotificationType ${mapping.type} has no manifest in registry, using default manifest`,
        'NotificationService',
        {
          notificationType: mapping.type,
          eventName: context.eventName,
          correlationId: context.correlationId,
          defaultChannels: Object.keys(defaultManifest.channels),
          defaultGroup: defaultManifest.group,
          defaultPriority: defaultManifest.priority,
        },
      );

      // Track default manifest usage in metrics
      if (this.metricsService) {
        // Note: We could add a specific metric for default manifest usage
        // For now, we log it and can add metrics later if needed
        this.logger.debug(
          `Default manifest generated for ${mapping.type}`,
          'NotificationService',
          {
            notificationType: mapping.type,
            eventName: context.eventName,
          },
        );
      }
    }
  }

  /**
   * Get all channels defined in manifest
   * @param manifest - Notification manifest
   * @returns Array of notification channels
   */
  private getChannelsFromManifest(
    manifest: NotificationManifest,
  ): NotificationChannel[] {
    return Object.keys(manifest.channels) as NotificationChannel[];
  }

  /**
   * Pipeline Step 2: Extract data from recipient info
   * All data must be provided via RecipientInfo - no extraction from events
   *
   * @param context - Processing context to populate
   * @param recipientInfo - Required recipient info with all necessary data
   */
  private extractEventData(
    context: Partial<NotificationProcessingContext>,
    recipientInfo: RecipientInfo,
  ): void {
    // Use data directly from recipientInfo - no extraction from events
    context.userId = recipientInfo.userId;
    context.profileType = recipientInfo.profileType;
    context.profileId = recipientInfo.profileId;
    context.recipient = recipientInfo.email || recipientInfo.phone; // For backward compat and logging
    context.phone = recipientInfo.phone; // Required - always exists
    context.centerId = recipientInfo.centerId || undefined; // Optional
    context.locale = recipientInfo.locale; // Required - from user.userInfo.locale
  }

  /**
   * Pipeline Step 3: Determine channels based on manifest
   */
  private determineChannels(
    context: Partial<NotificationProcessingContext>,
  ): void {
    const { manifest } = context;
    if (!manifest) {
      context.enabledChannels = [];
      return;
    }

    // Get channels from manifest - all users get same channels
    context.enabledChannels = this.getChannelsFromManifest(manifest) || [];
  }

  /**
   * Pipeline Step 5: Select optimal channels based on user activity and urgency
   */
  private async selectOptimalChannels(
    context: Partial<NotificationProcessingContext>,
  ): Promise<void> {
    const { userId, enabledChannels, manifest } = context;
    let finalChannels: NotificationChannel[] = enabledChannels!;

    if (userId && manifest) {
      try {
        finalChannels =
          await this.channelSelectionService.selectOptimalChannels(
            userId,
            enabledChannels!,
            {
              priority: manifest.priority,
              eventType: manifest.type,
              isSecurityEvent: manifest.requiresAudit || false,
            },
            manifest.priority,
            manifest.requiresAudit,
          );

        if (finalChannels.length === 0) {
          // Fallback to enabledChannels
          finalChannels = enabledChannels!;
          this.logger.debug(
            `Dynamic channel selection resulted in empty array, using enabledChannels fallback`,
            'NotificationService',
            {
              eventName: context.eventName,
              userId,
              fallbackChannels: finalChannels,
            },
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to apply dynamic channel selection, using original channels`,
          error instanceof Error ? error.stack : undefined,
          'NotificationService',
          {
            eventName: context.eventName,
            userId,
            correlationId: context.correlationId,
          },
        );
        // Fallback to original enabled channels
        finalChannels = enabledChannels!;
      }
    }

    context.finalChannels = finalChannels;
  }

  /**
   * Pipeline Step 6: Prepare template data with defaults and IN_APP-specific fields
   */
  private prepareTemplateData(
    context: Partial<NotificationProcessingContext>,
  ): void {
    const { event, mapping, manifest, eventName, finalChannels } = context;

    if (!event || !mapping || !manifest || !eventName || !finalChannels) {
      return;
    }

    // Prepare template data with link variable for auth events
    // Type assertion needed due to generic constraints, but type safety is enforced at compile time
    const templateData = this.templateService.ensureTemplateData(
      event as any,
      mapping,
      eventName,
    );

    // For IN_APP notifications, priority comes from manifest or template
    if (finalChannels.includes(NotificationChannel.IN_APP)) {
      templateData.priority = manifest.priority ?? 0;
    }

    context.templateData = templateData;
  }

  /**
   * Pipeline Step 7 & 8: Route notifications to channels (IN_APP direct send, others enqueue)
   */
  private async routeToChannels(
    context: Partial<NotificationProcessingContext>,
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

    if (!finalChannels || !mapping || !manifest || !templateData || !locale) {
      return;
    }

    // Process each final channel (after dynamic selection)
    for (const channel of finalChannels) {
      // Validate channel support
      if (!manifest.channels[channel]) {
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

      // Render template and build payload
      const rendered = await this.renderer.render(
        mapping.type,
        channel,
        templateData as Record<string, unknown>,
        locale,
      );

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

      // Send or enqueue notification
      try {
        await this.sendOrEnqueueNotification(
          channel,
          payload,
          userId,
          eventName,
          context.correlationId,
          manifest.priority || 0,
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
    }
  }

  /**
   * Determine recipient for a channel and validate format
   * @returns Validated recipient string or null if invalid/missing
   */
  private async determineAndValidateRecipient(
    channel: NotificationChannel,
    recipient: string | undefined,
    phone: string | undefined,
    userId: string | undefined,
    eventName: string | undefined,
    notificationType: string,
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
      channelRecipient = phone || null;
      if (!channelRecipient) {
        this.logger.warn(
          `Skipping ${channel} channel: no phone for user ${userId}`,
          'NotificationService',
          { userId, eventName, channel },
        );
        return null;
      }
    } else if (channel === NotificationChannel.IN_APP) {
      channelRecipient = userId || '';
    } else {
      // PUSH or other channels
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
          `Invalid email format for ${channel} channel: ${channelRecipient.substring(0, 20)}`,
          'NotificationService',
          {
            userId,
            eventName,
            channel,
            recipient: channelRecipient.substring(0, 20),
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
      const normalizedPhone = normalizePhone(channelRecipient);
      if (!normalizedPhone || !isValidE164(normalizedPhone)) {
        this.logger.warn(
          `Invalid phone format for ${channel} channel: ${channelRecipient.substring(0, 20)}`,
          'NotificationService',
          {
            userId,
            eventName,
            channel,
            recipient: channelRecipient.substring(0, 20),
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
    notificationType: string,
    channel: NotificationChannel,
    channelRecipient: string,
  ): Promise<{ shouldProceed: boolean; lockAcquired: boolean }> {
    // Type assertion needed - notificationType comes from mapping.type which is NotificationType
    const type = notificationType as any;
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
            recipient: channelRecipient.substring(0, 20),
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
            recipient: channelRecipient.substring(0, 20),
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
   */
  private buildBasePayload(
    channelRecipient: string,
    channel: NotificationChannel,
    mapping: NotificationEventMapping,
    manifest: NotificationManifest,
    locale: string,
    centerId: string | undefined,
    userId: string | undefined,
    profileType: ProfileType | null | undefined,
    profileId: string | null | undefined,
    correlationId: string | undefined,
  ) {
    return {
      recipient: channelRecipient,
      channel,
      type: mapping.type,
      group: manifest.group,
      locale,
      centerId,
      userId: userId ? createUserId(userId) : undefined,
      profileType: profileType ?? null,
      profileId: profileId ?? null,
      correlationId: correlationId
        ? createCorrelationId(correlationId)
        : undefined,
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
          priority:
            (inAppContent as Record<string, unknown>).priority ??
            templateData.priority ??
            manifest.priority ??
            0,
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

    // Fallback for other channels
    return {
      ...basePayload,
      channel,
      data: {
        ...templateData,
        content: rendered.content,
        template: rendered.metadata.template,
      },
    } as unknown as NotificationPayload;
  }

  /**
   * Send notification directly (IN_APP) or enqueue for async processing
   */
  private async sendOrEnqueueNotification(
    channel: NotificationChannel,
    payload: NotificationPayload,
    userId: string | undefined,
    eventName: string | undefined,
    correlationId: string | undefined,
    priority: number,
  ): Promise<void> {
    if (channel === NotificationChannel.IN_APP) {
      // Check rate limit for IN_APP
      if (userId) {
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
        age: 24 * 3600, // Keep completed jobs for 24 hours
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    });
  }
}
