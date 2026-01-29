import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for GROUP_DELETED notification (OPERATIONAL)
 *
 * Administrative action - Push for students/parents, In-App for staff
 * No WhatsApp - deletion is usually administrative cleanup
 * Multi-audience support:
 * - TEACHER: In-App only
 * - STAFF: In-App only
 * - STUDENTS: Push + In-App
 * - PARENTS: Push + In-App
 */
export const groupDeletedManifest = {
  type: NotificationType.GROUP_DELETED,
  group: NotificationGroup.MANAGEMENT,
  priority: 4, // High
  requiredVariables: ['groupName', 'className', 'centerName', 'actorName'],
  audiences: {
    TEACHER: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
    STAFF: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
    STUDENTS: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    PARENTS: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
