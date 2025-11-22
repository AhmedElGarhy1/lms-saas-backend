import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for PASSWORD_RESET notification
 *
 * Sent when a user requests a password reset
 * Supports Email, SMS, and WhatsApp channels
 */
export const passwordResetManifest = {
  type: NotificationType.PASSWORD_RESET,
  group: NotificationGroup.SECURITY,
  priority: 3,
  requiredVariables: ['link', 'expiresIn', 'name'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.EMAIL]: {
          template: 'email/auth/password-reset',
          subject: 'Password Reset Request',
        },
        [NotificationChannel.SMS]: {
          template: 'sms/auth/password-reset',
        },
        [NotificationChannel.WHATSAPP]: {
          template: 'password_reset',
        },
      },
    },
  },
} as const satisfies NotificationManifest;
