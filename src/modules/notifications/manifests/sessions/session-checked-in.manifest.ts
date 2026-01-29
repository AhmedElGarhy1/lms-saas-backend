import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for SESSION_CHECKED_IN notification
 *
 * Students/parents need to know session started (not teacher - they did it)
 * Multi-audience support:
 * - STUDENTS: Push + In-App (session started)
 * - PARENTS: Push + In-App (child's session started)
 * - TEACHER: None (they performed the action)
 * - STAFF: In-App only (operational)
 */
export const sessionCheckedInManifest = {
  type: NotificationType.SESSION_CHECKED_IN,
  group: NotificationGroup.MANAGEMENT,
  priority: 2, // Low
  requiredVariables: [
    'sessionTitle',
    'className',
    'groupName',
    'startTime',
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
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    // TEACHER: None - they performed the action
    STAFF: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
