import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for BRANCH_CREATED notification
 *
 * In-App only. Audiences: OWNERS, STAFF (branch).
 */
export const branchCreatedManifest = {
  type: NotificationType.BRANCH_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
  requiredVariables: ['branchName', 'centerName', 'actorName'],
  audiences: {
    OWNERS: {
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
