import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for GROUP_UPDATED notification
 *
 * Schedule changes get Push - otherwise In-App only
 * Note: Resolver will check changedFields and adjust channels:
 * - Schedule changes: Push + In-App for STUDENTS/PARENTS
 * - Other changes: In-App only
 *
 * This manifest defines the MAXIMUM channels for schedule changes.
 */
export const groupUpdatedManifest = {
  type: NotificationType.GROUP_UPDATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3, // Medium for schedule changes
  requiredVariables: ['groupName', 'className', 'centerName', 'actorName'],
  audiences: {
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
