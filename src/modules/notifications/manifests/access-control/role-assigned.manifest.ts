import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for ROLE_ASSIGNED notification
 *
 * Sent when a role is assigned to a user
 * Multi-audience support:
 * - TARGET: User who got role (Push + In-App)
 * - OWNERS: Center owners for optional alert (In-App)
 */
export const roleAssignedManifest = {
  type: NotificationType.ROLE_ASSIGNED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3, // Medium
  requiredVariables: ['name', 'roleName', 'centerName', 'actorName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    OWNERS: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
