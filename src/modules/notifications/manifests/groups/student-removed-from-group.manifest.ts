import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for STUDENT_REMOVED_FROM_GROUP notification (OPERATIONAL)
 *
 * Important but not emergency - Push + In-App
 * No WhatsApp - to avoid unnecessary cost
 */
export const studentRemovedFromGroupManifest = {
  type: NotificationType.STUDENT_REMOVED_FROM_GROUP,
  group: NotificationGroup.MANAGEMENT,
  priority: 3, // Medium
  requiredVariables: ['studentName', 'groupName', 'className', 'centerName', 'actorName'],
  audiences: {
    TARGET: {
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
