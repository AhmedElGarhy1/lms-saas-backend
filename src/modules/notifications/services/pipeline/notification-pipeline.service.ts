import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationManifest } from '../../manifests/types/manifest.types';
import { NotificationEvent } from '../../types/notification-event.types';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { AudienceId } from '../../types/audience.types';
import { NotificationTemplateData } from '../../types/template-data.types';
import { ChannelSelectionService } from '../channel-selection.service';
import { NotificationManifestResolver } from '../../manifests/registry/notification-manifest-resolver.service';
import { LoggerService } from '@/shared/services/logger.service';
import {
  isValidEmail,
  isValidE164,
  normalizePhone,
} from '../../utils/recipient-validator.util';
import { STRING_CONSTANTS } from '../../constants/notification.constants';

/**
 * Context object passed through the notification processing pipeline
 */
export interface NotificationProcessingContext {
  // Event and mapping
  eventName: NotificationType;
  event: NotificationEvent | Record<string, unknown>;
  mapping: { type: NotificationType };
  manifest: NotificationManifest;
  audience?: AudienceId;
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
  requestedChannels?: NotificationChannel[];
  enabledChannels: NotificationChannel[];
  finalChannels: NotificationChannel[];

  // Template data
  templateData: NotificationTemplateData;
}

/**
 * Service responsible for processing notification pipeline steps
 * Handles: event data extraction, channel determination, channel selection, template data preparation
 */
@Injectable()
export class NotificationPipelineService {
  constructor(
    private readonly channelSelectionService: ChannelSelectionService,
    private readonly manifestResolver: NotificationManifestResolver,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Process notification through the pipeline
   * Steps: extract event data -> determine channels -> select optimal channels -> prepare template data
   */
  async process(
    context: NotificationProcessingContext,
    recipientInfo: RecipientInfo,
  ): Promise<NotificationProcessingContext> {
    this.extractEventData(context, recipientInfo);
    this.determineChannels(context);
    
    if (context.enabledChannels && context.enabledChannels.length === 0) {
      this.logger.debug(
        `No enabled channels for ${context.eventName}, skipping`,
        'NotificationPipelineService',
        { userId: recipientInfo.userId, eventName: context.eventName },
      );
      return context;
    }

    await this.selectOptimalChannels(context);
    this.prepareTemplateData(context);
    
    return context;
  }

  /**
   * Extract event data and populate recipient information in context
   */
  extractEventData(
    context: NotificationProcessingContext,
    recipientInfo: RecipientInfo,
  ): void {
    const { event, manifest, audience } = context;

    // Extract recipient information
    context.userId = recipientInfo.userId;
    context.recipient = recipientInfo.email || recipientInfo.phone || ''; // For backward compat and logging
    context.phone = recipientInfo.phone; // Required - always exists
    context.centerId = recipientInfo.centerId || undefined;
    context.locale = recipientInfo.locale || 'en';
    context.profileType = recipientInfo.profileType || null;
    context.profileId = recipientInfo.profileId || null;

    // Extract event-specific data for template rendering
    const eventData = event as Record<string, unknown>;
    context.templateData = {
      ...eventData,
      userId: recipientInfo.userId,
      email: recipientInfo.email || null,
      phone: recipientInfo.phone || null,
      locale: context.locale,
      centerId: context.centerId || null,
      profileType: context.profileType,
      profileId: context.profileId,
    } as NotificationTemplateData;
  }

  /**
   * Determine enabled channels from manifest and requested channels
   */
  determineChannels(context: NotificationProcessingContext): void {
    const { manifest, audience, requestedChannels } = context;

    if (!manifest) {
      this.logger.warn(
        `No manifest found for ${context.eventName}`,
        'NotificationPipelineService',
      );
      context.enabledChannels = [];
      return;
    }

    // Get channels from manifest
    const manifestChannels =
      this.getChannelsFromManifest(manifest, audience) || [];

    // If channels are requested, validate and filter
    if (requestedChannels && requestedChannels.length > 0) {
      const validChannels = this.validateRequestedChannels(
        requestedChannels,
        manifestChannels,
        manifest,
        audience,
      );
      context.enabledChannels = validChannels;
    } else {
      context.enabledChannels = manifestChannels;
    }
  }

  /**
   * Get channels from manifest for given audience
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

    // Fallback to first audience if no audience specified
    const firstAudience = Object.keys(manifest.audiences)[0];
    if (firstAudience) {
      const audienceConfig = manifest.audiences[firstAudience];
      return Object.keys(audienceConfig.channels) as NotificationChannel[];
    }

    return [];
  }

  /**
   * Validate requested channels against manifest channels
   */
  private validateRequestedChannels(
    requestedChannels: NotificationChannel[],
    manifestChannels: NotificationChannel[],
    manifest: NotificationManifest,
    audience?: AudienceId,
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

    if (invalidChannels.length > 0) {
      this.logger.warn(
        `Invalid channels requested for ${manifest.type}:${audience || 'default'}: ${invalidChannels.join(', ')}. Available channels: ${manifestChannels.join(', ')}`,
        'NotificationPipelineService',
        {
          eventName: manifest.type,
          audience,
          requestedChannels,
          manifestChannels,
          invalidChannels,
        },
      );
    }

    // If all requested channels are invalid, log warning but return empty array
    if (validChannels.length === 0 && requestedChannels.length > 0) {
      this.logger.warn(
        `All requested channels are invalid for ${manifest.type}:${audience || 'default'}. Using manifest channels instead.`,
        'NotificationPipelineService',
        {
          eventName: manifest.type,
          audience,
          requestedChannels,
          manifestChannels,
        },
      );
    }

    return validChannels;
  }

  /**
   * Select optimal channels based on user activity and event context
   */
  async selectOptimalChannels(
    context: NotificationProcessingContext,
  ): Promise<void> {
    const { userId, manifest, enabledChannels } = context;

    if (userId && manifest) {
      try {
        const finalChannels =
          await this.channelSelectionService.selectOptimalChannels(
            userId,
            enabledChannels,
            {
              priority: (manifest.priority as number) || 0,
              eventType: context.eventName,
            },
          );

        if (finalChannels.length === 0) {
          this.logger.debug(
            `No optimal channels selected for user ${userId} and event ${manifest.type}`,
            'NotificationPipelineService',
            {
              userId,
              eventName: manifest.type,
              enabledChannels,
            },
          );
        }

        context.finalChannels = finalChannels;
      } catch (error) {
        this.logger.error(
          `Failed to select optimal channels for user ${userId}`,
          error instanceof Error ? error.stack : undefined,
          'NotificationPipelineService',
          {
            userId,
            eventName: manifest.type,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        // Fallback to enabled channels on error
        context.finalChannels = enabledChannels;
      }
    } else {
      // No userId or manifest - use enabled channels as-is
      context.finalChannels = enabledChannels;
    }
  }

  /**
   * Prepare template data for rendering
   */
  prepareTemplateData(context: NotificationProcessingContext): void {
    const { event, manifest, finalChannels } = context;

    if (!event || !manifest || !finalChannels) {
      return;
    }

    // Template data is already prepared in extractEventData
    // This method can be extended for additional template data preparation
    // For example, adding channel-specific data or formatting

    // For IN_APP channel, ensure we have the required structure
    if (finalChannels.includes(NotificationChannel.IN_APP)) {
      // IN_APP requires specific structure - ensure it's present
      if (!context.templateData) {
        context.templateData = {} as NotificationTemplateData;
      }
    }
  }
}

