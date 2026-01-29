import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for SESSION_FINISHED notification - PARENT-FOCUSED
 *
 * Parents need to know when child is done (pickup time)
 * Multi-audience support:
 * - STUDENTS: In-App only (they know it finished - they were there)
 * - PARENTS: Push + In-App (critical - child finished, time to pick up)
 * - TEACHER: In-App only (they know it finished - they conducted it)
 * - STAFF: In-App only (operational)
 */
export const sessionFinishedManifest = {
  type: NotificationType.SESSION_FINISHED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3, // Medium
  requiredVariables: [
    'sessionTitle',
    'className',
    'groupName',
    'endTime',
    'centerName',
  ],
  audiences: {
    STUDENTS: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
    PARENTS: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
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
  },
} as const satisfies NotificationManifest;
