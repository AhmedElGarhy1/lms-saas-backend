import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for New Device Login notification
 *
 * Sent when a user logs in from a new device.
 * In-App only - no SMS to avoid spam.
 */
export const newDeviceLoginManifest = {
  type: NotificationType.NEW_DEVICE_LOGIN,
  group: NotificationGroup.SECURITY,
  priority: 3,
  requiredVariables: ['name', 'deviceName'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
