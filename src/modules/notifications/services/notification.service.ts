import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { NotificationPreferenceService } from './notification-preference.service';
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
  getUnmappedEventSeverity,
  NotificationEventMapping,
  resolveChannels,
  resolveChannelsSafe,
  isProfileScoped,
} from '../config/notifications.map';
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

/**
 * Context object passed through the notification processing pipeline
 */
interface NotificationProcessingContext {
  eventName: EventType | string;
  event: NotificationEvent | Record<string, unknown>;
  mapping: NotificationEventMapping;
  recipient: string;
  userId?: string;
  centerId?: string;
  locale: string;
  profileType?: ProfileType | null;
  profileId?: string | null;
  channelsToCheck: NotificationChannel[];
  enabledChannels: NotificationChannel[];
  finalChannels: NotificationChannel[];
  templateData: Record<string, unknown>;
  correlationId: string;
}

@Injectable()
export class NotificationService {
  // Initialize p-limit once per service instance (not per method call)
  // This ensures optimal performance by reusing the limiter across all processEvent calls
  private readonly concurrencyLimit = pLimit(20);

  constructor(
    @InjectQueue('notifications') private readonly queue: Queue,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly senderService: NotificationSenderService,
    private readonly channelSelectionService: ChannelSelectionService,
    private readonly templateService: NotificationTemplateService,
    private readonly inAppNotificationService: InAppNotificationService,
    private readonly logger: LoggerService,
    private readonly retryStrategyService: ChannelRetryStrategyService,
    private readonly metricsService?: NotificationMetricsService,
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
   * 2. Extract recipient, userId, centerId, locale, profileInfo from event data
   * 3. Determine channels based on mapping (profile-scoped vs user-level)
   * 4. Check user preferences for each channel (parallelized)
   * 5. Apply dynamic channel selection based on user activity and urgency
   * 6. Prepare template data with defaults and IN_APP-specific fields
   * 7. For IN_APP: Check rate limit, send directly via NotificationSenderService
   * 8. For other channels: Enqueue via BullMQ queue
   *
   * Edge cases handled:
   * - Missing userId: Assumes enabled for system notifications
   * - Profile-scoped channels: Resolved dynamically using resolveChannels() helper
   * - Unmapped events: Uses DEFAULT_NOTIFICATION_MAPPING with severity-based logging
   * - Rate limit exceeded: Skips IN_APP delivery, continues with other channels
   *
   * Multi-recipient support:
   * - If recipients array is provided, process each recipient through the pipeline
   * - Use concurrency limiting to prevent event loop pressure
   * - Deduplicate recipients by userId before processing
   * - Track metrics for multi-recipient notifications
   *
   * @param eventName - Event type (EventType enum or string)
   * @param event - Event object containing notification data
   * @param recipients - Optional array of recipients to notify (for multi-recipient events)
   */
  async processEvent(
    eventName: EventType | string,
    event: NotificationEvent | Record<string, unknown>,
    recipients?: RecipientInfo[],
  ): Promise<void> {
    // Extract or generate correlation ID for request tracing
    const requestContext = RequestContext.get();
    const correlationId = requestContext?.requestId || randomUUID();

    // If recipients array provided, process each recipient
    if (recipients && recipients.length > 0) {
      // Deduplicate recipients by userId (final safety check)
      const uniqueRecipients = this.deduplicateRecipients(recipients);
      const concurrencyLimit = 20;
      const startTime = Date.now();

      // Log structured metrics at start
      logNotificationStart(this.logger, {
        eventName,
        correlationId,
        recipientCount: uniqueRecipients.length,
        concurrencyLimit,
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
              // Create modified event with recipient data
              const recipientEvent = {
                ...event,
                actor: {
                  ...(event as any).actor,
                  userId: recipient.userId,
                  userProfileId: recipient.profileId,
                  profileType: recipient.profileType,
                  email: recipient.email,
                },
              };
              await this.processEventForRecipient(
                eventName,
                recipientEvent,
                correlationId,
              );
            } catch (error) {
              logNotificationError(
                this.logger,
                {
                  eventName,
                  correlationId,
                  recipientId: recipient.userId,
                  error:
                    error instanceof Error ? error.message : String(error),
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
      const successCount = results.filter((r) => r.status === 'fulfilled')
        .length;
      const failureCount = results.filter((r) => r.status === 'rejected')
        .length;
      logNotificationComplete(this.logger, {
        eventName,
        correlationId,
        duration,
        successCount,
        failureCount,
        recipientCount: uniqueRecipients.length,
        concurrencyLimit,
      });
    } else {
      // Existing single-recipient logic (backward compatible)
      await this.processEventForRecipient(eventName, event, correlationId);
    }
  }

  /**
   * Process event for a single recipient
   * Extracted from processEvent to avoid code duplication
   */
  private async processEventForRecipient(
    eventName: EventType | string,
    event: NotificationEvent | Record<string, unknown>,
    correlationId: string,
  ): Promise<void> {
    // Initialize processing context
    const context: Partial<NotificationProcessingContext> = {
      eventName,
      event,
      correlationId,
    };

    // Execute pipeline steps sequentially
    this.lookupMapping(context);
    const hasRecipient = this.extractEventData(context);
    if (!hasRecipient) {
      return; // Early exit if no recipient
    }
    this.determineChannels(context);
    await this.checkPreferences(context);
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
   * Pipeline Step 1: Lookup notification mapping
   */
  private lookupMapping(context: Partial<NotificationProcessingContext>): void {
    const { eventName } = context;
    let mapping = NotificationEventsMap[eventName as EventType];
    if (!mapping) {
      // Use default mapping for unmapped events
      const severity = getUnmappedEventSeverity(eventName!);
      const logMessage = `No notification mapping found for event: ${eventName}, using default mapping`;

      if (severity === 'error') {
        this.logger.error(logMessage, undefined, 'NotificationService', {
          eventName,
          severity,
          correlationId: context.correlationId,
        });
      } else if (severity === 'warn') {
        this.logger.warn(logMessage, 'NotificationService', {
          eventName,
          severity,
          correlationId: context.correlationId,
        });
      } else {
        this.logger.log(logMessage, 'NotificationService', {
          eventName,
          severity,
          correlationId: context.correlationId,
        });
      }

      mapping = DEFAULT_NOTIFICATION_MAPPING;
    }

    context.mapping = mapping;
  }

  /**
   * Pipeline Step 2: Extract data from event
   * @returns true if recipient found, false otherwise (early exit)
   */
  private extractEventData(
    context: Partial<NotificationProcessingContext>,
  ): boolean {
    const { event, mapping } = context;
    if (!event) {
      return false;
    }
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
   * Pipeline Step 3: Determine channels based on mapping
   */
  private determineChannels(
    context: Partial<NotificationProcessingContext>,
  ): void {
    const { mapping, profileType } = context;
    if (!mapping) {
      context.channelsToCheck = [];
      return;
    }

    // Use helper function to resolve channels dynamically
    context.channelsToCheck = resolveChannels(mapping, profileType);
  }

  /**
   * Pipeline Step 4: Check user preferences for each channel
   */
  private async checkPreferences(
    context: Partial<NotificationProcessingContext>,
  ): Promise<void> {
    const {
      userId,
      channelsToCheck,
      mapping,
      profileType,
      profileId,
    } = context;
    const profileScoped = mapping ? isProfileScoped(mapping) : false;
    const enabledChannels: NotificationChannel[] = [];

    if (userId) {
      // Parallelize preference checks for better performance
      const preferenceChecks = await Promise.all(
        channelsToCheck!.map((channel) =>
          this.preferenceService
            .isEnabled(
              userId,
              channel,
              mapping!.group,
              profileScoped ? profileType : null,
              profileScoped ? profileId : null,
            )
            .then((isEnabled) => ({ channel, isEnabled }))
            .catch((error) => {
              // Log error but assume enabled to avoid blocking
              this.logger.warn(
                `Failed to check preference for channel ${channel}: ${error instanceof Error ? error.message : String(error)}`,
                'NotificationService',
              );
              return { channel, isEnabled: true };
            }),
        ),
      );

      for (const { channel, isEnabled } of preferenceChecks) {
        if (isEnabled) {
          enabledChannels.push(channel);
        }
      }
    } else {
      // If no userId, assume enabled (system notifications)
      enabledChannels.push(...channelsToCheck!);
    }

    context.enabledChannels = enabledChannels;

    if (enabledChannels.length === 0) {
      this.logger.debug(
        `User ${userId} has disabled all channels for ${context.eventName}`,
      );
    }
  }

  /**
   * Pipeline Step 5: Select optimal channels based on user activity and urgency
   */
  private async selectOptimalChannels(
    context: Partial<NotificationProcessingContext>,
  ): Promise<void> {
    const { userId, enabledChannels, mapping } = context;
    let finalChannels: NotificationChannel[] = enabledChannels!;

    if (userId) {
      try {
        finalChannels =
          await this.channelSelectionService.selectOptimalChannels(
            userId,
            enabledChannels!,
            {
              priority: mapping!.priority,
              eventType: mapping!.type,
              isSecurityEvent: mapping!.requiresAudit || false,
            },
            mapping!,
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
    const { event, mapping, eventName, finalChannels, userId, centerId } =
      context;

    if (!event || !mapping || !eventName || !finalChannels) {
      return;
    }

    // Prepare template data with link variable for auth events
    const templateData = this.templateService.ensureTemplateData(
      event,
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
      templateData.priority = inAppData.priority ?? mapping.priority ?? 0;
      templateData.severity = inAppData.severity;
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
      finalChannels,
      mapping,
      templateData,
      locale,
      centerId,
      userId,
      profileType,
      profileId,
      eventName,
    } = context;
    const profileScoped = mapping ? isProfileScoped(mapping) : false;

    if (!finalChannels || !recipient || !mapping || !templateData || !locale) {
      return;
    }

    // Process each final channel (after dynamic selection)
    for (const channel of finalChannels) {
      const payload: NotificationPayload = {
        recipient,
        channel,
        type: mapping.type,
        group: mapping.group,
        data: templateData,
        locale,
        centerId,
        userId,
        profileType: profileScoped ? profileType : null,
        profileId: profileScoped ? profileId : null,
        correlationId: context.correlationId,
      };

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
        await this.enqueueJob(payload, mapping.priority || 0);
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
