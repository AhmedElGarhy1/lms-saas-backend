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
export const passwordResetManifest: NotificationManifest = {
  type: NotificationType.PASSWORD_RESET,
  group: NotificationGroup.SECURITY,
  priority: 3,
  requiresAudit: true,
  templateBase: 'auth/password-reset',
  channels: {
    [NotificationChannel.EMAIL]: {
      subject: 'Password Reset Request',
      requiredVariables: ['link', 'expiresIn', 'name'],
    },
    [NotificationChannel.SMS]: {
      requiredVariables: ['link', 'expiresIn', 'name'],
    },
    [NotificationChannel.WHATSAPP]: {
      requiredVariables: ['link', 'expiresIn', 'name'],
    },
  },
} as const;
