import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for OTP notification
 *
 * Sent when a one-time password is generated for verification
 * Supports SMS, WhatsApp, Email, and In-App channels
 */
export const otpManifest = {
  type: NotificationType.OTP,
  group: NotificationGroup.SECURITY,
  priority: 4,
  requiredVariables: ['otpCode', 'expiresIn'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.SMS]: {
          template: 'sms/auth/otp',
        },
        [NotificationChannel.IN_APP]: {
          // Template not needed - uses i18n system with NotificationType enum value as key
        },
      },
    },
  },
} as const satisfies NotificationManifest;
