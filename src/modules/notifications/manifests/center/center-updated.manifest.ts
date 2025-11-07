import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_UPDATED notification
 *
 * Sent when a center's information is updated
 * Supports IN_APP and WhatsApp channels
 */
export const centerUpdatedManifest: NotificationManifest = {
  type: NotificationType.CENTER_UPDATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
  templateBase: 'center-updated',
  channels: {
    [NotificationChannel.EMAIL]: {
      subject: 'Center Information Updated',
      requiredVariables: ['center'],
      defaultLocale: 'en',
    },
    [NotificationChannel.SMS]: {
      requiredVariables: ['center'],
      defaultLocale: 'en',
    },
    [NotificationChannel.WHATSAPP]: {
      requiredVariables: ['center'],
      defaultLocale: 'en',
    },
    [NotificationChannel.IN_APP]: {
      requiredVariables: ['center'],
      defaultLocale: 'en',
    },
  },
} as const;
