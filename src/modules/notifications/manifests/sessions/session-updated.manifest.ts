import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for SESSION_UPDATED notification - HIGH PRIORITY
 *
 * Parents need WhatsApp for any change (especially time changes)
 * Multi-audience support:
 * - STUDENTS: Push + In-App
 * - PARENTS: WhatsApp + Push + In-App (any change is important for parents)
 * - TEACHER: Push + In-App
 * - STAFF: In-App only (for audit trail)
 */
export const sessionUpdatedManifest = {
  type: NotificationType.SESSION_UPDATED,
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
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    PARENTS: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'session_updated_parent',
        },
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    TEACHER: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    STAFF: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
