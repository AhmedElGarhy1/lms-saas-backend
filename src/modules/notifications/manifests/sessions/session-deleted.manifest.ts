import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for SESSION_DELETED notification - CRITICAL
 *
 * Similar to cancellation - prevents unnecessary travel
 * Multi-audience support:
 * - STUDENTS: WhatsApp + Push + In-App
 * - PARENTS: WhatsApp + Push + In-App (safety concern)
 * - TEACHER: WhatsApp + Push + In-App
 * - STAFF: Push + In-App (operational awareness)
 */
export const sessionDeletedManifest = {
  type: NotificationType.SESSION_DELETED,
  group: NotificationGroup.MANAGEMENT,
  priority: 5, // High
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
          template: 'session_deleted',
        },
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    PARENTS: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'session_deleted_parent',
        },
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    TEACHER: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'session_deleted_teacher',
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
