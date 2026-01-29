import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for Password Changed notification
 *
 * Sent when a user changes their password.
 * In-App only - confirmation for the user.
 */
export const passwordChangedManifest = {
  type: NotificationType.PASSWORD_CHANGED,
  group: NotificationGroup.SECURITY,
  priority: 2,
  requiredVariables: ['name'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
