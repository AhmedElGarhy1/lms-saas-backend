import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for SESSION_CANCELED notification - CRITICAL
 *
 * Parents need to know immediately to prevent unnecessary travel
 * Multi-audience support:
 * - STUDENTS: WhatsApp + Push + In-App
 * - PARENTS: WhatsApp + Push + In-App (safety concern)
 * - TEACHER: WhatsApp + Push + In-App
 * - STAFF: Push + In-App (operational awareness)
 */
export const sessionCanceledManifest = {
  type: NotificationType.SESSION_CANCELED,
  group: NotificationGroup.MANAGEMENT,
  priority: 6, // Critical
  requiredVariables: [
    'sessionTitle',
    'className',
    'groupName',
    'startTime',
    'centerName',
    'actorName',
  ],
  audiences: {
    STUDENTS: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'session_canceled',
        },
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    PARENTS: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'session_canceled_parent',
        },
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    TEACHER: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'session_canceled_teacher',
        },
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
  },
} as const satisfies NotificationManifest;
