import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for BRANCH_DELETED notification
 *
 * Push + In-App (more impactful). Audiences: OWNERS, STAFF (branch).
 */
export const branchDeletedManifest = {
  type: NotificationType.BRANCH_DELETED,
  group: NotificationGroup.MANAGEMENT,
  priority: 4,
  requiredVariables: ['branchName', 'centerName', 'actorName'],
  audiences: {
    OWNERS: {
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
