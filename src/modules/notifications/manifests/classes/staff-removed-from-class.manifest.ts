import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for STAFF_REMOVED_FROM_CLASS notification (OPERATIONAL)
 *
 * Staff needs to know removal - Push + In-App
 * Single audience: TARGET (the staff member being removed)
 */
export const staffRemovedFromClassManifest = {
  type: NotificationType.STAFF_REMOVED_FROM_CLASS,
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
