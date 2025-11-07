import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import {
  NotificationManifest,
  ChannelManifest,
  AudienceManifest,
} from '../types/manifest.types';
import { NotificationRegistry } from './notification-registry';
import { getChannelFolder } from '../../config/template-format.config';
import { NotificationTemplatePath } from '../../types/templates.generated';
import { AudienceId } from '../../types/audience.types';

/**
 * Service for resolving notification manifests and channel configurations
 *
 * Supports multi-audience notifications where different audiences
 * can have different channels and configurations
 */
@Injectable()
export class NotificationManifestResolver {
  /**
   * Get manifest for a notification type
   * @param type - Notification type
   * @returns Notification manifest
   * @throws Error if manifest is missing
   */
  getManifest(type: NotificationType): NotificationManifest {
    const manifest = NotificationRegistry[type];

    if (!manifest || Object.keys(manifest).length === 0) {
      throw new Error(`Missing manifest for type: ${type}`);
    }

    return manifest;
  }

  /**
   * Get audience configuration from a manifest
   * @param manifest - Notification manifest
   * @param audience - Audience identifier
   * @returns Audience manifest configuration
   * @throws Error if audience is not supported
   */
  getAudienceConfig(
    manifest: NotificationManifest,
    audience: AudienceId,
  ): AudienceManifest {
    const audienceConfig = manifest.audiences[audience];

    if (!audienceConfig) {
      const availableAudiences = Object.keys(manifest.audiences).join(', ');
      throw new Error(
        `Audience ${audience} not supported for type ${manifest.type}. Available audiences: ${availableAudiences}`,
      );
    }

    return audienceConfig;
  }

  /**
   * Get channel configuration for a specific audience
   * Resolves template path from templateBase if not explicitly provided
   * @param manifest - Notification manifest
   * @param audience - Audience identifier
   * @param channel - Notification channel
   * @returns Channel manifest configuration with resolved template path
   * @throws Error if channel is not supported or template path cannot be resolved
   */
  getChannelConfigForAudience(
    manifest: NotificationManifest,
    audience: AudienceId,
    channel: NotificationChannel,
  ): ChannelManifest {
    const audienceConfig = this.getAudienceConfig(manifest, audience);
    const config = audienceConfig.channels[channel];

    if (!config) {
      throw new Error(
        `Channel ${channel} not supported for audience ${audience} in type ${manifest.type}`,
      );
    }

    // Resolve template path
    return this.resolveChannelTemplate(manifest, config);
  }

  /**
   * Get available audiences for a manifest
   * @param manifest - Notification manifest
   * @returns Array of audience IDs
   */
  getAvailableAudiences(manifest: NotificationManifest): AudienceId[] {
    return Object.keys(manifest.audiences);
  }

  /**
   * Resolve channel template path
   * Helper method to resolve template from config or templateBase
   * @param manifest - Notification manifest
   * @param config - Channel manifest configuration
   * @returns Channel manifest with resolved template path
   */
  private resolveChannelTemplate(
    manifest: NotificationManifest,
    config: ChannelManifest,
  ): ChannelManifest {
    // If template is already provided, use it
    if (config.template) {
      return config;
    }

    // If templateBase is provided, derive template path
    if (manifest.templateBase) {
      // This will be resolved per-channel when we know the channel
      // For now, return config as-is - template resolution happens in getChannelConfigForAudience
      return config;
    }

    throw new Error(
      `Template path not specified for ${manifest.type}. Either provide templateBase in manifest or explicit template in channel config.`,
    );
  }

  /**
   * Resolve template path for a specific channel
   * @param manifest - Notification manifest
   * @param channel - Notification channel
   * @param config - Channel manifest configuration
   * @returns Resolved template path
   */
  resolveTemplatePath(
    manifest: NotificationManifest,
    channel: NotificationChannel,
    config: ChannelManifest,
  ): string {
    if (config.template) {
      return config.template;
    }

    if (manifest.templateBase) {
      const channelFolder = getChannelFolder(channel);
      return `${channelFolder}/${manifest.templateBase}`;
    }

    throw new Error(
      `Template path not specified for ${manifest.type}:${channel}. Either provide templateBase in manifest or explicit template in channel config.`,
    );
  }

  /**
   * Get channel configuration for a specific audience (with resolved template)
   * This is the main method used by the notification service
   * @param manifest - Notification manifest
   * @param audience - Audience identifier
   * @param channel - Notification channel
   * @returns Channel manifest configuration with resolved template path
   */
  getChannelConfig(
    manifest: NotificationManifest,
    audience: AudienceId,
    channel: NotificationChannel,
  ): ChannelManifest {
    const audienceConfig = this.getAudienceConfig(manifest, audience);
    const config = audienceConfig.channels[channel];

    if (!config) {
      throw new Error(
        `Channel ${channel} not supported for audience ${audience} in type ${manifest.type}`,
      );
    }

    // Resolve template path
    const resolvedTemplate = this.resolveTemplatePath(manifest, channel, config);

    return {
      ...config,
      template: resolvedTemplate as NotificationTemplatePath,
    };
  }
}
