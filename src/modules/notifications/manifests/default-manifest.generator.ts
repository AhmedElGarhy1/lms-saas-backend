import { NotificationType } from '../enums/notification-type.enum';
import { NotificationGroup } from '../enums/notification-group.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationManifest, ChannelManifest } from './types/manifest.types';

/**
 * Generate a default manifest for a notification type
 * Used as fallback when manifest is missing at runtime
 * Provides minimal configuration to allow processing to continue
 */
export function generateDefaultManifest(
  notificationType: NotificationType,
): NotificationManifest {
  // Determine group based on notification type name
  let group = NotificationGroup.SYSTEM;
  const typeName = notificationType.toLowerCase();

  if (
    typeName.includes('auth') ||
    typeName.includes('password') ||
    typeName.includes('otp') ||
    typeName.includes('verification') ||
    typeName.includes('security')
  ) {
    group = NotificationGroup.SECURITY;
  } else if (
    typeName.includes('center') ||
    typeName.includes('branch') ||
    typeName.includes('management')
  ) {
    group = NotificationGroup.MANAGEMENT;
  }

  // Default channels: IN_APP only (safest fallback)
  const defaultChannelConfig: ChannelManifest = {
    template: 'in-app/default',
  };

  return {
    type: notificationType,
    group,
    priority: 1, // Lowest priority
    requiredVariables: [], // No required variables for default template
    audiences: {
      DEFAULT: {
        channels: {
          [NotificationChannel.IN_APP]: defaultChannelConfig,
        },
      },
    },
  };
}
