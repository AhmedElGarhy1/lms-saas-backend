import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for EMAIL_VERIFICATION notification
 *
 * Sent when a user needs to verify their email address
 * Supports Email channel only
 */
export const emailVerificationManifest = {
  type: NotificationType.EMAIL_VERIFICATION,
  group: NotificationGroup.SECURITY,
  priority: 3,
  requiredVariables: ['link', 'expiresIn', 'name'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.EMAIL]: {
          template: 'email/auth/email-verification',
          subject: 'Verify Your Email',
        },
        [NotificationChannel.SMS]: {
          template: 'sms/auth/email-verification',
        },
        [NotificationChannel.WHATSAPP]: {
          template: 'email_verification',
        },
        [NotificationChannel.IN_APP]: {
          template: 'in-app/auth/email-verification',
        },
      },
    },
  },
} as const satisfies NotificationManifest;
