import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for Login Failed notification
 *
 * Sent when someone tries to login with wrong credentials.
 * In-App only - user should know if someone is trying to access their account.
 */
export const loginFailedManifest = {
  type: NotificationType.LOGIN_FAILED,
  group: NotificationGroup.SECURITY,
  priority: 3,
  requiredVariables: ['name'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
