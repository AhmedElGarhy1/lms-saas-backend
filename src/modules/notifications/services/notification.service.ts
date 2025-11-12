import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { BaseService } from '@/shared/common/services/base.service';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationManifest } from '../manifests/types/manifest.types';
import { NotificationRenderer } from '../renderer/notification-renderer.service';
import { RenderedNotification } from '../manifests/types/manifest.types';
import { randomUUID, createHash } from 'crypto';
import { NotificationEvent } from '../types/notification-event.types';
import { RecipientInfo } from '../types/recipient-info.interface';
import { MultiRecipientProcessor } from './multi-recipient-processor.service';
import {
  logNotificationStart,
  logNotificationComplete,
  logNotificationError,
} from '../utils/notification-metrics-logger.util';
import { NotificationTemplateData } from '../types/template-data.types';
import { AudienceId } from '../types/audience.types';
import { NotificationType } from '../enums/notification-type.enum';
import { validateRecipients } from '../validation/recipient-info.schema';
import { InvalidRecipientException } from '../exceptions/invalid-recipient.exception';
import {
  NotificationPipelineService,
  NotificationProcessingContext,
} from './pipeline/notification-pipeline.service';
import { NotificationRouterService } from './routing/notification-router.service';
import { BulkNotificationResult } from '../types/bulk-notification-result.interface';

@Injectable()
export class NotificationService extends BaseService {
  private readonly logger: Logger = new Logger(NotificationService.name);
  private readonly concurrencyLimit: number;

  constructor(
    private readonly manifestResolver: NotificationManifestResolver,
    private readonly renderer: NotificationRenderer,
    private readonly pipelineService: NotificationPipelineService,
    private readonly routerService: NotificationRouterService,
    private readonly multiRecipientProcessor: MultiRecipientProcessor,
  ) {
    super();
    this.concurrencyLimit = this.multiRecipientProcessor.getConcurrencyLimit();
  }

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
    const context: NotificationProcessingContext = {
      eventName: notificationType,
      event,
      correlationId,
      requestedChannels: channels,
      audience,
      manifest,
      mapping: { type: notificationType },
      enabledChannels: [],
      finalChannels: [],
      recipient: '',
      locale: 'en',
      templateData: {} as NotificationTemplateData,
    };

    await this.pipelineService.process(context, recipientInfo);

    if (context.enabledChannels && context.enabledChannels.length === 0) {
      return;
    }

    await this.routerService.route(context, preRenderedCache);
  }

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

    const result: BulkNotificationResult = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0,
      correlationId: '',
    };

    const manifest = this.manifestResolver.getManifest(type);
    this.manifestResolver.getAudienceConfig(manifest, audience);

    // Generate correlationId at entry point - don't rely on RequestContext
    // This works in all contexts: HTTP requests, background jobs, event listeners, cron jobs
    const correlationId = randomUUID();
    result.correlationId = correlationId;

    const validationResult = validateRecipients(recipients);

    if (validationResult.errors.length > 0) {
      for (const error of validationResult.errors) {
        const recipient = recipients[error.index];
        const errorMessages = error.errors.errors
          .map((e) => e.message)
          .join('; ');

        result.errors.push({
          recipient: recipient?.userId ?? `index-${error.index}`,
          error: errorMessages,
          code: 'VALIDATION_ERROR',
        });

        this.logger.error(
          `Invalid recipient at index ${error.index}`,
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

      result.skipped = validationResult.errors.length;

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

    if (validationResult.valid.length > 0) {
      const uniqueRecipients = this.deduplicateRecipients(
        validationResult.valid as RecipientInfo[],
      );

      if (uniqueRecipients.length === 0) {
        this.logger.warn(
          `No valid recipients after deduplication for notification: ${type}`,
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
        concurrencyLimit: this.concurrencyLimit,
      });

      const preRenderedCache = new Map<string, RenderedNotification>();
      const recipientGroups = this.groupRecipientsByTemplateData(
        uniqueRecipients,
        type,
        event,
        manifest,
        audience,
      );

      for (const group of recipientGroups) {
        if (group.recipients.length > 1) {
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
      }

      const processResults =
        await this.multiRecipientProcessor.processRecipients(
          uniqueRecipients,
          async (recipient) => {
            await this.processEventForRecipient(
              type,
              event,
              correlationId,
              recipient,
              manifest,
              audience,
              channels,
              preRenderedCache,
            );
          },
        );

      const endTime = Date.now();
      const duration = endTime - startTime;
      let successCount = 0;
      let failureCount = 0;

      for (const processResult of processResults) {
        if (processResult.success) {
          successCount++;
        } else {
          failureCount++;
          const error =
            processResult.result instanceof Error
              ? processResult.result
              : new Error(String(processResult.result));
          const errorCode =
            'code' in error && typeof error.code === 'string'
              ? error.code
              : 'UNKNOWN_ERROR';

          result.errors.push({
            recipient: processResult.recipient.userId,
            error: error.message,
            code: errorCode,
          });

          logNotificationError(
            this.logger,
            {
              eventName: type,
              correlationId,
              recipientId: processResult.recipient.userId,
              profileId: processResult.recipient.profileId ?? undefined,
              profileType: processResult.recipient.profileType ?? undefined,
              error: error.message,
            },
            error,
          );
        }
      }

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
        concurrencyLimit: this.concurrencyLimit,
      });
    } else {
      result.skipped = result.total;
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  private groupRecipientsByTemplateData(
    recipients: RecipientInfo[],
    notificationType: NotificationType,
    event: NotificationEvent | Record<string, unknown>,
    manifest: NotificationManifest,
    audience: AudienceId,
  ): Array<{ templateDataHash: string; recipients: RecipientInfo[] }> {
    const groups = new Map<string, RecipientInfo[]>();

    for (const recipient of recipients) {
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

      const existing = groups.get(hash);
      if (existing) {
        existing.push(recipient);
      } else {
        groups.set(hash, [recipient]);
      }
    }

    return Array.from(groups.entries()).map(
      ([templateDataHash, recipients]) => ({
        templateDataHash,
        recipients,
      }),
    );
  }

  private prepareTemplateDataForHash(
    event: NotificationEvent | Record<string, unknown>,
    recipient: RecipientInfo,
    manifest: NotificationManifest,
  ): Record<string, unknown> {
    const eventData = { ...(event as Record<string, unknown>) };
    delete eventData.userId;
    delete eventData.recipient;
    delete eventData.phone;
    delete eventData.centerId;
    delete eventData.profileId;
    delete eventData.profileType;
    delete eventData.locale;

    if (manifest.priority !== undefined) {
      eventData.priority = manifest.priority;
    }

    return eventData;
  }

  private hashTemplateData(
    notificationType: NotificationType,
    locale: string,
    templateData: Record<string, unknown>,
    audience?: AudienceId,
  ): string {
    const hashInput = JSON.stringify({
      type: notificationType,
      locale,
      audience,
      data: templateData,
    });

    return createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .substring(0, 16);
  }

  private getTemplateCacheKey(
    notificationType: NotificationType,
    channel: NotificationChannel,
    locale: string,
    templateData: Record<string, unknown>,
    audience?: AudienceId,
  ): string {
    const dataForHash = { ...templateData };
    delete dataForHash.userId;
    delete dataForHash.recipient;
    delete dataForHash.phone;
    delete dataForHash.centerId;
    delete dataForHash.profileId;
    delete dataForHash.profileType;

    const hash = this.hashTemplateData(
      notificationType,
      locale,
      dataForHash,
      audience,
    );
    return `${notificationType}:${channel}:${locale}:${hash}`;
  }

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

    const representative = group.recipients[0];
    if (!representative) {
      return;
    }

    const templateData = this.prepareTemplateDataForHash(
      event,
      representative,
      manifest,
    );

    const audienceConfig = this.manifestResolver.getAudienceConfig(
      manifest,
      audience,
    );
    const availableChannels = Object.keys(
      audienceConfig.channels,
    ) as NotificationChannel[];

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

          if (!cache.has(cacheKey)) {
            const rendered = await this.renderer.render(
              notificationType,
              channel,
              templateData,
              locale,
              audience,
            );
            cache.set(cacheKey, rendered);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to pre-render template for group: ${group.templateDataHash}`,
            {
              error: error instanceof Error ? error.message : String(error),
              channel,
              locale,
              correlationId,
            },
          );
        }
      }
    }
  }
}
