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
export const otpManifest: NotificationManifest = {
  type: NotificationType.OTP,
  group: NotificationGroup.SECURITY,
  priority: 4,
  requiresAudit: true,
  templateBase: 'auth/otp',
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.SMS]: {
          requiredVariables: ['otpCode', 'expiresIn'],
        },
        [NotificationChannel.WHATSAPP]: {
          requiredVariables: ['otpCode', 'expiresIn'],
        },
        [NotificationChannel.EMAIL]: {
          subject: 'Your Verification Code',
          requiredVariables: ['otpCode', 'expiresIn'],
        },
        [NotificationChannel.IN_APP]: {
          requiredVariables: ['otpCode', 'expiresIn'],
        },
      },
    },
  },
} as const;
