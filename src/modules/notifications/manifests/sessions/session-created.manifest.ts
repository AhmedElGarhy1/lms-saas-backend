import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for SESSION_CREATED notification
 *
 * Students and teachers need reminders, parents just need awareness
 * Multi-audience support:
 * - STUDENTS: Push + In-App (reminder)
 * - PARENTS: In-App only (just for awareness, not urgent)
 * - TEACHER: Push + In-App (reminder)
 * - STAFF: In-App only (operational)
 */
export const sessionCreatedManifest = {
  type: NotificationType.SESSION_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3, // Medium
  requiredVariables: [
    'sessionTitle',
    'className',
    'groupName',
    'startTime',
    'endTime',
    'teacherName',
    'centerName',
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
