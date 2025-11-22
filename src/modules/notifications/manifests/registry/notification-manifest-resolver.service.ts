import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import {
  NotificationManifest,
  ChannelManifest,
  AudienceManifest,
} from '../types/manifest.types';
import { NotificationRegistry } from './notification-registry';
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
   * @param manifest - Notification manifest
   * @param audience - Audience identifier
   * @param channel - Notification channel
   * @returns Channel manifest configuration
   * @throws Error if channel is not supported
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

    return config;
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
   * Get channel configuration for a specific audience
   * This is the main method used by the notification service
   * @param manifest - Notification manifest
   * @param audience - Audience identifier
   * @param channel - Notification channel
   * @returns Channel manifest configuration
   * @throws Error if channel is not supported
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

    return config;
  }
}
