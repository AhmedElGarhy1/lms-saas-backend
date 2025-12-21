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
export const centerUpdatedManifest = {
  type: NotificationType.CENTER_UPDATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
  requiredVariables: ['centerName'],
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.EMAIL]: {
          template: 'email/center-updated',
          subject: 'Center Information Updated',
        },
        [NotificationChannel.SMS]: {
          template: 'sms/center-updated',
        },
        [NotificationChannel.WHATSAPP]: {
          template: 'center_updated',
        },
        [NotificationChannel.IN_APP]: {
          // Template not needed - uses i18n system with NotificationType enum value as key
        },
      },
    },
  },
} as const satisfies NotificationManifest;
