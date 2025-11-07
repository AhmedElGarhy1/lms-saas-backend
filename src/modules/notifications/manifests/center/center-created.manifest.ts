import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_CREATED notification
 *
 * Sent when a new learning center is created
 * Supports EMAIL and WhatsApp channels
 *
 * Template variables:
 * - center: Center object with name, address, phone, email
 * - userData: Optional user data with name
 * - link: Optional link to manage center
 */
export const centerCreatedManifest: NotificationManifest = {
  type: NotificationType.CENTER_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
  requiresAudit: true,
  templateBase: 'center-created',
  channels: {
    [NotificationChannel.EMAIL]: {
      subject: 'Center Created Successfully',
      requiredVariables: ['center'],
    },
    [NotificationChannel.SMS]: {
      requiredVariables: ['center'],
    },
    [NotificationChannel.WHATSAPP]: {
      requiredVariables: ['center'],
    },
    [NotificationChannel.IN_APP]: {
      requiredVariables: ['center'],
    },
  },
} as const;
