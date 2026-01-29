import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for SESSION_CONFLICT_DETECTED notification
 *
 * Administrative issue, doesn't concern students/parents
 * Multi-audience support:
 * - STUDENTS: None (not their concern)
 * - PARENTS: None (not their concern)
 * - TEACHER: Push + In-App (needs to resolve conflict)
 * - STAFF: Push + In-App (needs to resolve conflict)
 */
export const sessionConflictDetectedManifest = {
  type: NotificationType.SESSION_CONFLICT_DETECTED,
  group: NotificationGroup.MANAGEMENT,
  priority: 4, // Medium
  requiredVariables: [
    'groupName',
    'conflictType',
    'proposedStartTime',
    'proposedEndTime',
    'centerName',
  ],
  audiences: {
    // STUDENTS: None - not their concern
    // PARENTS: None - not their concern
    TEACHER: {
      channels: {
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
