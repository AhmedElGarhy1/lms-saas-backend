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
import {
  extractRecipient,
  extractUserId,
  extractCenterId,
  extractProfileInfo,
  extractLocale,
} from '../utils/notification-extractors';
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
  isValidRecipientForChannel,
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
   * Enqueue a notification job
   */
  async enqueueNotification(payload: NotificationPayload): Promise<void> {
    const jobData: NotificationJobData = {
      ...payload,
      retryCount: 0,
    };

    await this.queue.add('send-notification', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    });
  }

  /**
   * Enqueue multiple notifications
   */
  async enqueueNotifications(payloads: NotificationPayload[]): Promise<void> {
    await Promise.all(
      payloads.map((payload) => this.enqueueNotification(payload)),
    );
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
    recipients?: RecipientInfo[],
  ): Promise<void> {
    // Extract or generate correlation ID for request tracing
    const requestContext = RequestContext.get();
    const correlationId = requestContext?.requestId || randomUUID();

    // If recipients array provided, process each recipient
    if (recipients && recipients.length > 0) {
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
        centerId: extractCenterId(event),
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
    } else {
      // Existing single-recipient logic (backward compatible)
      await this.processEventForRecipient(eventName, event, correlationId);
    }
  }

  /**
   * Process event for a single recipient
   * Extracted from processEvent to avoid code duplication
   *
   * @param eventName - Event type (EventType enum or string)
   * @param event - Event object containing notification data (remains immutable)
   * @param correlationId - Correlation ID for request tracing
   * @param recipientInfo - Optional recipient info (for multi-recipient scenarios)
   */
  private async processEventForRecipient(
    eventName: EventType | string,
    event: NotificationEvent | Record<string, unknown>,
    correlationId: string,
    recipientInfo?: RecipientInfo,
  ): Promise<void> {
    // Initialize processing context
    const context: Partial<NotificationProcessingContext> = {
      eventName,
      event,
      correlationId,
    };

    // Execute pipeline steps sequentially
    this.lookupMapping(context);
    const hasRecipient = this.extractEventData(context, recipientInfo);
    if (!hasRecipient) {
      return; // Early exit if no recipient
    }
    this.determineChannels(context);
    this.checkPreferences(context);
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
    } catch (error) {
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
   * Pipeline Step 2: Extract data from event or use provided recipient info
   * When recipientInfo is provided, use it directly instead of extracting from event
   * This keeps events immutable and makes recipient data flow explicit
   *
   * @param context - Processing context to populate
   * @param recipientInfo - Optional recipient info (for multi-recipient scenarios)
   * @returns true if recipient found, false otherwise (early exit)
   */
  private extractEventData(
    context: Partial<NotificationProcessingContext>,
    recipientInfo?: RecipientInfo,
  ): boolean {
    const { event } = context;
    if (!event) {
      return false;
    }

    // If recipient info is provided, use it directly (for multi-recipient scenarios)
    if (recipientInfo) {
      // Validate phone exists (required)
      if (!recipientInfo.phone) {
        this.logger.error(
          `Recipient ${recipientInfo.userId} missing required phone number`,
          undefined,
          'NotificationService',
          { userId: recipientInfo.userId },
        );
        return false; // Early exit
      }

      context.userId = recipientInfo.userId;
      context.profileType = recipientInfo.profileType;
      context.profileId = recipientInfo.profileId;
      context.recipient = recipientInfo.email || recipientInfo.phone; // Fallback for backward compat
      context.phone = recipientInfo.phone; // Store phone separately for channel routing
      context.centerId = extractCenterId(event);
      context.locale = extractLocale(event);
      return true;
    }

    // Fallback to extraction from event (for single-recipient scenarios)
    const recipient = extractRecipient(event);
    if (!recipient) {
      this.logger.debug(
        `No recipient found for event: ${context.eventName}`,
        'NotificationService',
        {
          eventName: context.eventName,
          correlationId: context.correlationId,
        },
      );
      return false; // Early exit signal
    }

    context.recipient = recipient;
    context.userId = extractUserId(event);
    context.centerId = extractCenterId(event);
    context.locale = extractLocale(event);
    const profileInfo = extractProfileInfo(event);
    context.profileType = profileInfo.profileType;
    context.profileId = profileInfo.profileId;
    return true;
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
   * Pipeline Step 4: All channels are enabled (preferences removed)
   * Users receive notifications based on internal configuration only
   */
  private checkPreferences(
    context: Partial<NotificationProcessingContext>,
  ): void {
    // All channels from manifest are enabled - no user preferences
    // enabledChannels is already set in determineChannels()
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
    const {
      event,
      mapping,
      manifest,
      eventName,
      finalChannels,
      userId,
      centerId,
    } = context;

    if (!event || !mapping || !manifest || !eventName || !finalChannels) {
      return;
    }

    // Prepare template data with link variable for auth events
    // Type assertion needed due to generic constraints, but type safety is enforced at compile time
    const templateData = this.templateService.ensureTemplateData(
      event as Record<string, unknown>,
      mapping,
      eventName,
    );

    // For IN_APP notifications, extract and structure title, message, actionUrl
    if (finalChannels.includes(NotificationChannel.IN_APP)) {
      const inAppData = this.templateService.buildInAppNotificationData(
        eventName,
        event,
        userId,
        centerId,
      );
      templateData.title = inAppData.title;
      templateData.message = inAppData.message;
      templateData.actionUrl =
        inAppData.actionUrl || (templateData.actionUrl as string | undefined);
      templateData.priority = inAppData.priority ?? manifest.priority ?? 0;
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
      // Determine recipient based on channel type
      let channelRecipient: string | null = null;

      if (channel === NotificationChannel.EMAIL) {
        // EMAIL channel requires email
        const email = recipient?.includes('@') ? recipient : null;
        if (!email) {
          this.logger.debug(
            `Skipping EMAIL channel: no email for user ${userId}`,
            'NotificationService',
            { userId, eventName },
          );
          continue; // Skip this channel
        }
        channelRecipient = email;
      } else if (
        channel === NotificationChannel.SMS ||
        channel === NotificationChannel.WHATSAPP
      ) {
        // SMS/WHATSAPP channels require phone
        channelRecipient = phone || null;
        if (!channelRecipient) {
          this.logger.warn(
            `Skipping ${channel} channel: no phone for user ${userId}`,
            'NotificationService',
            { userId, eventName, channel },
          );
          continue; // Skip this channel
        }
      } else if (channel === NotificationChannel.IN_APP) {
        // IN_APP uses userId, not recipient
        channelRecipient = userId || '';
      } else {
        // PUSH or other channels - use email or phone as fallback
        channelRecipient = recipient || phone || null;
      }

      if (!channelRecipient) {
        this.logger.debug(
          `Skipping ${channel} channel: no recipient data`,
          'NotificationService',
          { userId, eventName, channel },
        );
        continue;
      }

      // Validate recipient format based on channel
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
          // Track invalid recipient metric
          if (this.metricsService) {
            await this.metricsService.incrementFailed(channel, mapping.type);
          }
          continue; // Skip invalid recipient
        }
      } else if (
        channel === NotificationChannel.SMS ||
        channel === NotificationChannel.WHATSAPP
      ) {
        // Normalize phone to E.164 format
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
          // Track invalid recipient metric
          if (this.metricsService) {
            await this.metricsService.incrementFailed(channel, mapping.type);
          }
          continue; // Skip invalid recipient
        }
        // Use normalized phone number
        channelRecipient = normalizedPhone;
      }

      // Build payload based on channel type
      // For EMAIL, we need subject and html
      // For SMS/WHATSAPP, we need content
      // For IN_APP, we need title and message
      const basePayload = {
        recipient: channelRecipient,
        channel,
        type: mapping.type,
        group: manifest.group,
        locale,
        centerId,
        userId: userId ? createUserId(userId) : undefined,
        profileType: profileType ?? null,
        profileId: profileId ?? null,
        correlationId: context.correlationId
          ? createCorrelationId(context.correlationId)
          : undefined,
      };

      // Check idempotency before processing (if cache service is available)
      // Use distributed lock to prevent race conditions
      let lockAcquired = false;
      if (this.idempotencyCache && context.correlationId) {
        try {
          // Acquire lock to prevent concurrent processing
          lockAcquired = await this.idempotencyCache.acquireLock(
            context.correlationId,
            mapping.type,
            channel,
            channelRecipient,
          );

          if (!lockAcquired) {
            // Lock already held or timeout - skip to prevent duplicate
            this.logger.debug(
              `Skipping notification (lock not acquired): ${mapping.type}:${channel}`,
              'NotificationService',
              {
                correlationId: context.correlationId,
                type: mapping.type,
                channel,
                recipient: channelRecipient.substring(0, 20),
              },
            );
            continue; // Skip this notification
          }

          // Check if already sent (with lock held)
          const alreadySent = await this.idempotencyCache.checkAndSet(
            context.correlationId,
            mapping.type,
            channel,
            channelRecipient,
          );

          if (alreadySent) {
            // Release lock before continuing
            await this.idempotencyCache.releaseLock(
              context.correlationId,
              mapping.type,
              channel,
              channelRecipient,
            );
            this.logger.debug(
              `Skipping duplicate notification (idempotency): ${mapping.type}:${channel}`,
              'NotificationService',
              {
                correlationId: context.correlationId,
                type: mapping.type,
                channel,
                recipient: channelRecipient.substring(0, 20),
              },
            );
            continue; // Skip this notification
          }
        } catch (error) {
          // On error, release lock if acquired
          if (lockAcquired) {
            await this.idempotencyCache.releaseLock(
              context.correlationId,
              mapping.type,
              channel,
              channelRecipient,
            );
          }
          // Fail open - allow notification to proceed
          this.logger.warn(
            `Idempotency check failed, proceeding anyway: ${mapping.type}:${channel}`,
            'NotificationService',
            {
              correlationId: context.correlationId,
              type: mapping.type,
              channel,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      // Use manifest-driven rendering (mandatory - all types must have manifests)
      // Manifest is already loaded in context from lookupMapping step

      // Check if this channel is supported in manifest
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
        continue; // Skip unsupported channel
      }

      // Use renderer to get pre-rendered content
      const rendered = await this.renderer.render(
        mapping.type,
        channel,
        templateData as Record<string, unknown>,
        locale,
      );

      // Build payload with rendered content
      let payload: NotificationPayload;

      if (channel === NotificationChannel.EMAIL) {
        if (!rendered.subject) {
          this.logger.error(
            `Email subject missing for ${mapping.type}`,
            undefined,
            'NotificationService',
            { notificationType: mapping.type, channel },
          );
          continue; // Skip this channel
        }
        payload = {
          ...basePayload,
          channel: NotificationChannel.EMAIL,
          subject: rendered.subject,
          data: {
            html: rendered.content,
            content: rendered.content,
            ...templateData,
            template: rendered.metadata.template,
          },
        } as NotificationPayload;
      } else if (
        channel === NotificationChannel.SMS ||
        channel === NotificationChannel.WHATSAPP
      ) {
        payload = {
          ...basePayload,
          channel,
          data: {
            content: rendered.content,
            message: rendered.content,
            html: rendered.content,
            ...templateData,
            template: rendered.metadata.template,
          },
        } as NotificationPayload;
      } else if (channel === NotificationChannel.IN_APP) {
        // IN_APP content is an object from JSON template
        const inAppContent =
          typeof rendered.content === 'object'
            ? rendered.content
            : { message: rendered.content };
        payload = {
          ...basePayload,
          channel: NotificationChannel.IN_APP,
          title:
            (inAppContent as any).title ||
            (templateData as any).title ||
            'Notification',
          data: {
            message: (inAppContent as any).message || String(rendered.content),
            content:
              typeof rendered.content === 'string'
                ? rendered.content
                : undefined,
            html:
              typeof rendered.content === 'string'
                ? rendered.content
                : undefined,
            actionUrl: (inAppContent as any).actionUrl,
            priority: (inAppContent as any).priority,
            icon: (inAppContent as any).icon,
            expiresAt: (inAppContent as any).expiresAt,
            ...templateData,
            ...(typeof rendered.content === 'object' ? rendered.content : {}),
          },
        } as NotificationPayload;
      } else if (channel === NotificationChannel.PUSH) {
        // PUSH channel requires title
        payload = {
          ...basePayload,
          channel: NotificationChannel.PUSH,
          title: (templateData as any).title || 'Notification',
          data: {
            ...templateData,
            content: rendered.content,
            message: rendered.content,
            template: rendered.metadata.template,
          },
        } as NotificationPayload;
      } else {
        // Fallback for other channels
        payload = {
          ...basePayload,
          channel,
          data: {
            ...templateData,
            content: rendered.content,
            template: rendered.metadata.template,
          },
        } as unknown as NotificationPayload;
      }

      // Send notification (lock will be released in finally block)
      try {
        // Skip queue for IN_APP notifications - send directly for real-time delivery
        if (channel === NotificationChannel.IN_APP) {
          try {
            // Check rate limit for IN_APP notifications before sending
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
                // Skip this IN_APP notification, continue with other channels
                continue;
              }
            }

            // Send directly without queuing for low latency
            await this.senderService.send(payload);
            this.logger.debug(
              `IN_APP notification sent directly (skipped queue): ${eventName} to user ${userId}`,
              'NotificationService',
              {
                eventName,
                userId,
                correlationId: context.correlationId,
              },
            );

            // TODO: Future - Track delivery acknowledgment for analytics
            // This could be used for batching/throttling in future phases
          } catch (error) {
            this.logger.error(
              `Failed to send IN_APP notification directly: ${error instanceof Error ? error.message : String(error)}`,
              error instanceof Error ? error.stack : undefined,
              'NotificationService',
              {
                userId,
                eventName,
                correlationId: context.correlationId,
              },
            );
            // Don't throw - already logged, continue with other channels
          }
        } else {
          // For other channels, enqueue job for async processing
          // Lock will be released after enqueue (markSent happens in processor)
          await this.enqueueJob(payload, manifest.priority || 0);
        }
      } finally {
        // Release lock after notification is sent/enqueued
        // For IN_APP: released after send completes
        // For other channels: released after enqueue (processor handles markSent separately)
        if (lockAcquired && this.idempotencyCache && context.correlationId) {
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
