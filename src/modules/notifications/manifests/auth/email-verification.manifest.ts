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
export const emailVerificationManifest: NotificationManifest = {
  type: NotificationType.EMAIL_VERIFICATION,
  group: NotificationGroup.SECURITY,
  priority: 3,
  requiresAudit: true,
  templateBase: 'auth/email-verification',
  channels: {
    [NotificationChannel.EMAIL]: {
      subject: 'Verify Your Email',
      requiredVariables: ['link', 'expiresIn', 'name'],
    },
    [NotificationChannel.SMS]: {
      requiredVariables: ['link', 'expiresIn', 'name'],
    },
    [NotificationChannel.WHATSAPP]: {
      requiredVariables: ['link', 'expiresIn', 'name'],
    },
    [NotificationChannel.IN_APP]: {
      requiredVariables: ['link', 'expiresIn', 'name'],
    },
  },
} as const;
