import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationManifest, ChannelManifest } from '../types/manifest.types';
import { NotificationRegistry } from './notification-registry';
import { getChannelFolder } from '../../config/template-format.config';
import { NotificationTemplatePath } from '../../types/templates.generated';

/**
 * Service for resolving notification manifests and channel configurations
 *
 * Separates registry access from rendering logic to avoid import cycles
 * and keep the renderer focused purely on rendering
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
   * Get channel configuration from a manifest
   * Resolves template path from templateBase if not explicitly provided
   * @param manifest - Notification manifest
   * @param channel - Notification channel
   * @returns Channel manifest configuration with resolved template path
   * @throws Error if channel is not supported or template path cannot be resolved
   */
  getChannelConfig(
    manifest: NotificationManifest,
    channel: NotificationChannel,
  ): ChannelManifest {
    const config = manifest.channels[channel];

    if (!config) {
      throw new Error(
        `Channel ${channel} not supported for type ${manifest.type}`,
      );
    }

    // Resolve template path
    let resolvedTemplate: string;

    if (config.template) {
      // Explicit template path provided
      resolvedTemplate = config.template;
    } else if (manifest.templateBase) {
      // Derive from templateBase: {channel}/{templateBase}
      const channelFolder = getChannelFolder(channel);
      resolvedTemplate = `${channelFolder}/${manifest.templateBase}`;
    } else {
      throw new Error(
        `Template path not specified for ${manifest.type}:${channel}. Either provide templateBase in manifest or explicit template in channel config.`,
      );
    }

    // Return config with resolved template path
    // Note: resolvedTemplate is a string (derived from templateBase), not necessarily in NotificationTemplatePath
    // This is acceptable since templateBase-derived paths are validated at runtime
    return {
      ...config,
      template: resolvedTemplate,
    };
  }
}
