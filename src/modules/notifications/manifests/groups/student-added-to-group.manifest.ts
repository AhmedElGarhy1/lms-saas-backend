import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for STUDENT_ADDED_TO_GROUP notification (OPERATIONAL)
 *
 * Enrollment confirmation - Push + In-App for student and parents
 * No WhatsApp - to avoid cost for bulk enrollments
 */
export const studentAddedToGroupManifest = {
  type: NotificationType.STUDENT_ADDED_TO_GROUP,
  group: NotificationGroup.MANAGEMENT,
  priority: 3, // Medium
  requiredVariables: ['studentName', 'groupName', 'className', 'centerName'],
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
