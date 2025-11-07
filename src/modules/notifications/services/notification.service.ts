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
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationManifest } from '../manifests/types/manifest.types';
import { NotificationRenderer } from '../renderer/notification-renderer.service';
import { NotificationIdempotencyCacheService } from './notification-idempotency-cache.service';
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
import { AudienceId } from '../types/audience.types';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * Context object passed through the notification processing pipeline
 *
 * Fields are populated sequentially as the pipeline progresses:
 * 1. extractEventData: userId, recipient, phone, centerId, locale, profileType, profileId
 * 2. determineChannels: enabledChannels (from manifest and audience)
 * 3. selectOptimalChannels: finalChannels (optimized based on user activity)
 * 4. prepareTemplateData: templateData
 * 5. routeToChannels: uses finalChannels, templateData, manifest
 */
interface NotificationProcessingContext {
  // Event and mapping
  eventName: NotificationType; // Notification type enum
  event: NotificationEvent | Record<string, unknown>;
  mapping: { type: NotificationType }; // Simple mapping for compatibility
  manifest: NotificationManifest; // Single source of truth for all config
  audience?: AudienceId; // Audience identifier for multi-audience notifications
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
  requestedChannels?: NotificationChannel[]; // Optional channels override from caller
  enabledChannels: NotificationChannel[]; // Channels from manifest (after preferences check)
  finalChannels: NotificationChannel[]; // Optimized channels (after activity-based selection)

  // Template data
  templateData: NotificationTemplateData;
}

@Injectable()
export class NotificationService {
  // Initialize p-limit once per service instance (not per method call)
  // This ensures optimal performance by reusing the limiter across all trigger calls
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
   */
  private async processEventForRecipient(
    notificationType: NotificationType,
    event: NotificationEvent | Record<string, unknown>,
    correlationId: string,
    recipientInfo: RecipientInfo,
    manifest: NotificationManifest,
    audience: AudienceId,
    channels?: NotificationChannel[],
  ): Promise<void> {
    // Initialize processing context
    const context: Partial<NotificationProcessingContext> = {
      eventName: notificationType,
      event,
      correlationId,
      requestedChannels: channels,
      audience,
      manifest,
      mapping: { type: notificationType }, // Simple mapping for compatibility
    };

    // Execute pipeline steps sequentially
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
   * Trigger a notification with audience specification
   * This is the preferred method for sending notifications with multi-audience support
   *
   * @param type - Notification type
   * @param options - Trigger options including audience, event, recipients, and optional channels
   */
  async trigger(
    type: NotificationType,
    options: {
      audience: AudienceId;
      event: NotificationEvent | Record<string, unknown>;
      recipients: RecipientInfo[];
      channels?: NotificationChannel[];
    },
  ): Promise<void> {
    const { audience, event, recipients, channels } = options;

    // Get manifest
    const manifest = this.manifestResolver.getManifest(type);

    // Validate audience exists
    this.manifestResolver.getAudienceConfig(manifest, audience);

    // Extract or generate correlation ID
    const requestContext = RequestContext.get();
    const correlationId = requestContext?.requestId || randomUUID();

    // Process each recipient
    if (recipients.length > 0) {
      const uniqueRecipients = this.deduplicateRecipients(recipients);

      if (uniqueRecipients.length === 0) {
        this.logger.warn(
          `No valid recipients after deduplication for notification: ${type}`,
          'NotificationService',
          {
            notificationType: type,
            audience,
            correlationId,
            originalCount: recipients.length,
          },
        );
        return;
      }

      const startTime = Date.now();

      logNotificationStart(this.logger, {
        eventName: type,
        correlationId,
        recipientCount: uniqueRecipients.length,
        concurrencyLimit: NotificationService.CONCURRENCY_LIMIT,
      });

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
              );
            } catch (error) {
              logNotificationError(
                this.logger,
                {
                  eventName: type,
                  correlationId,
                  recipientId: recipient.userId,
                  profileId: recipient.profileId ?? undefined,
                  profileType: recipient.profileType ?? undefined,
                  error: error instanceof Error ? error.message : String(error),
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
      logNotificationComplete(this.logger, {
        eventName: type,
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
   * Get all channels defined in manifest for a specific audience
   * @param manifest - Notification manifest
   * @param audience - Audience identifier
   * @returns Array of notification channels
   */
  private getChannelsFromManifest(
    manifest: NotificationManifest,
    audience?: AudienceId,
  ): NotificationChannel[] {
    if (audience) {
      const audienceConfig = this.manifestResolver.getAudienceConfig(
        manifest,
        audience,
      );
      return Object.keys(audienceConfig.channels) as NotificationChannel[];
    }
    // Fallback: get channels from first audience (for backward compatibility during migration)
    const firstAudience = Object.keys(manifest.audiences)[0];
    if (firstAudience) {
      const audienceConfig = manifest.audiences[firstAudience];
      return Object.keys(audienceConfig.channels) as NotificationChannel[];
    }
    return [];
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
   * Pipeline Step 3: Determine channels based on manifest and audience
   * If requestedChannels is provided, filters manifest channels to only include requested ones.
   * If not provided, uses all channels from manifest for the specified audience (default behavior).
   */
  private determineChannels(
    context: Partial<NotificationProcessingContext>,
  ): void {
    const { manifest, requestedChannels, audience } = context;
    if (!manifest) {
      context.enabledChannels = [];
      return;
    }

    // Get all channels from manifest for the specified audience
    const manifestChannels =
      this.getChannelsFromManifest(manifest, audience) || [];

    // If specific channels requested, filter manifest channels
    if (requestedChannels && requestedChannels.length > 0) {
      const validChannels = this.validateRequestedChannels(
        requestedChannels,
        manifest,
        manifestChannels,
      );
      context.enabledChannels = validChannels;
    } else {
      // Default: use all channels from manifest for the audience
      context.enabledChannels = manifestChannels;
    }
  }

  /**
   * Validate requested channels against manifest and return only valid ones
   * Logs warnings for channels that don't exist in manifest
   *
   * @param requestedChannels - Channels requested by caller
   * @param manifest - Notification manifest containing available channels
   * @param manifestChannels - Pre-computed list of channels from manifest
   * @returns Array of valid channels that exist in both requested and manifest
   */
  private validateRequestedChannels(
    requestedChannels: NotificationChannel[],
    manifest: NotificationManifest,
    manifestChannels: NotificationChannel[],
  ): NotificationChannel[] {
    const validChannels: NotificationChannel[] = [];
    const invalidChannels: NotificationChannel[] = [];

    for (const channel of requestedChannels) {
      if (manifestChannels.includes(channel)) {
        validChannels.push(channel);
      } else {
        invalidChannels.push(channel);
      }
    }

    // Log warnings for invalid channels
    if (invalidChannels.length > 0) {
      this.logger.warn(
        `Requested channels not available in manifest: ${invalidChannels.join(', ')}`,
        'NotificationService',
        {
          notificationType: manifest.type,
          requestedChannels,
          availableChannels: manifestChannels,
          invalidChannels,
        },
      );
    }

    // Log info if no valid channels found
    if (validChannels.length === 0 && requestedChannels.length > 0) {
      this.logger.warn(
        `No valid channels found after filtering. Requested: ${requestedChannels.join(', ')}, Available: ${manifestChannels.join(', ')}`,
        'NotificationService',
        {
          notificationType: manifest.type,
          requestedChannels,
          availableChannels: manifestChannels,
        },
      );
    }

    return validChannels;
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
    const templateData = this.templateService.ensureTemplateData(
      event,
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

      // Render template and build payload
      const rendered = await this.renderer.render(
        mapping.type,
        channel,
        templateData as Record<string, unknown>,
        locale,
        context.audience,
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
      recipient: channelRecipient,
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
        age: 24 * 3600, // Keep completed jobs for 24 hours
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    });
  }
}
