import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for 2FA Disabled notification
 *
 * Sent when a user disables two-factor authentication.
 * SMS + In-App - critical security event, user must be alerted immediately.
 */
export const twoFaDisabledManifest = {
  type: NotificationType.TWO_FA_DISABLED,
  group: NotificationGroup.SECURITY,
  priority: 5,
  requiredVariables: ['name'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.SMS]: {
          template: 'sms/auth/two-fa-disabled',
        },
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
