import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for STUDENT_ABSENT notification
 *
 * Push + In-App for PARENTS and TARGET (student).
 * Per business: "عندما الطالب ما يحضر ولي الأمر يُبلَّغ"
 */
export const studentAbsentManifest = {
  type: NotificationType.STUDENT_ABSENT,
  group: NotificationGroup.MANAGEMENT,
  priority: 4,
  requiredVariables: ['studentName', 'className', 'groupName', 'centerName', 'actorName'],
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
