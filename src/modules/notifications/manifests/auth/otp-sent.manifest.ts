import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for OTP_SENT notification
 *
 * Sent when a one-time password is generated for verification
 * Supports SMS, WhatsApp, Email, and In-App channels
 */
export const otpSentManifest: NotificationManifest = {
  type: NotificationType.OTP_SENT,
  group: NotificationGroup.SECURITY,
  priority: 4,
  requiresAudit: true,
  templateBase: 'auth/otp-sent',
  channels: {
    [NotificationChannel.SMS]: {
      requiredVariables: ['otpCode', 'expiresIn'],
      defaultLocale: 'en',
    },
    [NotificationChannel.WHATSAPP]: {
      requiredVariables: ['otpCode', 'expiresIn'],
      defaultLocale: 'en',
    },
    [NotificationChannel.EMAIL]: {
      subject: 'Your Verification Code',
      requiredVariables: ['otpCode', 'expiresIn'],
      defaultLocale: 'en',
    },
    [NotificationChannel.IN_APP]: {
      requiredVariables: ['otpCode', 'expiresIn'],
      defaultLocale: 'en',
    },
  },
} as const;
