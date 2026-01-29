import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CLASS_STATUS_CHANGED notification
 *
 * CRITICAL for CANCELED status - WhatsApp for students/parents (safety concern)
 * FINISHED status is expected end - In-App only
 *
 * Note: The resolver will check newStatus and adjust channels dynamically:
 * - CANCELED: WhatsApp + Push for STUDENTS/PARENTS
 * - FINISHED: In-App only for all
 *
 * This manifest defines the MAXIMUM channels. Resolver may reduce for FINISHED.
 */
export const classStatusChangedManifest = {
  type: NotificationType.CLASS_STATUS_CHANGED,
  group: NotificationGroup.MANAGEMENT,
  priority: 6, // Critical
  requiredVariables: ['className', 'oldStatus', 'newStatus', 'centerName', 'actorName'],
  audiences: {
    TEACHER: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    STAFF: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    STUDENTS: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'class_canceled',
        },
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    PARENTS: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'class_canceled_parent',
        },
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
