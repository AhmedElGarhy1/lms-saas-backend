import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for STAFF_ASSIGNED_TO_CLASS notification (OPERATIONAL)
 *
 * Staff needs to know new assignment - Push + In-App
 * Single audience: TARGET (the staff member being assigned)
 */
export const staffAssignedToClassManifest = {
  type: NotificationType.STAFF_ASSIGNED_TO_CLASS,
  group: NotificationGroup.MANAGEMENT,
  priority: 3, // Medium
  requiredVariables: ['staffName', 'className', 'centerName', 'actorName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
