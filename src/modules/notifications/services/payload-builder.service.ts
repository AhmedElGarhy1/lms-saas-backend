import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import {
  NotificationPayload,
  EmailNotificationPayload,
  SmsNotificationPayload,
  WhatsAppNotificationPayload,
  InAppNotificationPayload,
  PushNotificationPayload,
} from '../types/notification-payload.interface';
import {
  NotificationManifest,
  ChannelManifest,
} from '../manifests/types/manifest.types';
import { NotificationTemplateData } from '../types/template-data.types';
import { RenderedNotification } from '../manifests/types/manifest.types';
import { createUserId, createCorrelationId } from '../types/branded-types';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

/**
 * Base payload structure (shared across all channels)
 */
interface BasePayloadData {
  recipient: string;
  channel: NotificationChannel;
  type: NotificationType;
  group: string;
  locale: string;
  centerId?: string | null;
  userId: ReturnType<typeof createUserId>;
  profileType: ProfileType | null;
  profileId?: string | null;
  correlationId: ReturnType<typeof createCorrelationId>;
}

/**
 * Pure service for building notification payloads
 * No side effects, only data transformation
 */
@Injectable()
export class PayloadBuilderService {
  /**
   * Build base payload structure (shared across all channels)
   * Pure function - no side effects
   */
  buildBasePayload(
    recipient: string,
    channel: NotificationChannel,
    type: NotificationType,
    manifest: NotificationManifest,
    locale: string,
    centerId: string | undefined,
    userId: string,
    profileType: ProfileType | undefined,
    profileId: string | undefined,
    correlationId: string,
  ): BasePayloadData {
    return {
      recipient,
      channel,
      type,
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
   * Pure function - no side effects
   *
   * @param channel - Notification channel
   * @param basePayload - Base payload structure
   * @param rendered - Rendered notification content (not used for WhatsApp)
   * @param templateData - Template data used for rendering
   * @param manifest - Notification manifest (for requiredVariables)
   * @param channelConfig - Optional channel configuration (required for WhatsApp)
   * @returns Channel-specific payload or null if invalid
   */
  buildPayload(
    channel: NotificationChannel,
    basePayload: BasePayloadData,
    rendered: RenderedNotification,
    templateData: NotificationTemplateData,
    manifest: NotificationManifest,
    channelConfig?: ChannelManifest,
  ): NotificationPayload | null {
    if (channel === NotificationChannel.EMAIL) {
      if (!rendered.subject) {
        return null; // Missing subject - invalid payload
      }

      return {
        ...basePayload,
        subject: rendered.subject,
        data: {
          html: rendered.content as string,
          content: rendered.content as string,
          template: rendered.metadata?.template || '',
        },
      } as EmailNotificationPayload;
    }

    if (channel === NotificationChannel.SMS) {
      return {
        ...basePayload,
        data: {
          content: rendered.content as string,
          template: rendered.metadata?.template || '',
        },
      } as SmsNotificationPayload;
    }

    if (channel === NotificationChannel.WHATSAPP) {
      // WhatsApp uses template messages, not rendered content
      if (!channelConfig?.template) {
        return null; // Missing WhatsApp template name - invalid payload
      }

      // Extract template parameters from templateData based on manifest requiredVariables
      const requiredVariables = manifest.requiredVariables || [];
      const templateParameters = requiredVariables.map((varName) => {
        const value = templateData[varName];
        // Convert value to string, handling various types
        let textValue: string;
        if (value === undefined || value === null) {
          textValue = '';
        } else if (typeof value === 'string') {
          textValue = value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          textValue = String(value);
        } else if (typeof value === 'object') {
          try {
            textValue = JSON.stringify(value);
          } catch {
            textValue = '[object]';
          }
        } else {
          textValue = String(value);
        }

        return {
          type: 'text' as const,
          text: textValue,
        };
      });

      return {
        ...basePayload,
        data: {
          templateName: channelConfig.template, // Unified template field
          templateLanguage: basePayload.locale,
          templateParameters,
        },
      } as WhatsAppNotificationPayload;
    }

    if (channel === NotificationChannel.IN_APP) {
      const inAppContent = rendered.content as Record<string, unknown>;
      const title =
        (inAppContent.title as string) ||
        (templateData.title as string) ||
        'Notification';
      const message =
        (inAppContent.message as string) ||
        (inAppContent.content as string) ||
        '';

      return {
        ...basePayload,
        title,
        data: {
          message,
          ...inAppContent,
          template: rendered.metadata?.template || '',
          expiresAt: inAppContent.expiresAt as Date | undefined,
        },
      } as InAppNotificationPayload;
    }

    if (channel === NotificationChannel.PUSH) {
      const pushContent = rendered.content as Record<string, unknown>;
      const title =
        (pushContent.title as string) ||
        (templateData.title as string) ||
        'Notification';
      const message =
        (pushContent.message as string) || (pushContent.body as string) || '';

      return {
        ...basePayload,
        title,
        data: {
          message,
          ...((pushContent.data as Record<string, unknown> | undefined)
            ? { data: pushContent.data as Record<string, unknown> }
            : {}),
          template: rendered.metadata?.template || '',
        },
      } as PushNotificationPayload;
    }

    // Unknown channel type
    return null;
  }

  /**
   * Build complete payload in one call (convenience method)
   * Combines buildBasePayload and buildPayload
   */
  buildCompletePayload(
    recipient: string,
    channel: NotificationChannel,
    type: NotificationType,
    manifest: NotificationManifest,
    locale: string,
    centerId: string | undefined,
    userId: string,
    profileType: ProfileType | undefined,
    profileId: string | undefined,
    correlationId: string,
    rendered: RenderedNotification,
    templateData: NotificationTemplateData,
    channelConfig?: ChannelManifest,
  ): NotificationPayload | null {
    const basePayload = this.buildBasePayload(
      recipient,
      channel,
      type,
      manifest,
      locale,
      centerId,
      userId,
      profileType,
      profileId,
      correlationId,
    );

    return this.buildPayload(
      channel,
      basePayload,
      rendered,
      templateData,
      manifest,
      channelConfig,
    );
  }
}
