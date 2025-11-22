import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for PHONE_VERIFIED notification
 *
 * Sent when a user's phone number is successfully verified
 * Supports SMS and In-App channels only
 */
export const phoneVerifiedManifest: NotificationManifest = {
  type: NotificationType.PHONE_VERIFIED,
  group: NotificationGroup.SECURITY,
  priority: 3,
  requiresAudit: true,
  requiredVariables: ['phone'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.SMS]: {
          template: 'sms/auth/phone-verified',
        },
        [NotificationChannel.IN_APP]: {
          template: 'in-app/auth/phone-verified',
        },
      },
    },
  },
} as const;
