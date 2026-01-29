import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for USER_PROFILE_DELETED notification
 *
 * User profile soft-deleted. TARGET only. Push + In-App.
 */
export const userProfileDeletedManifest = {
  type: NotificationType.USER_PROFILE_DELETED,
  group: NotificationGroup.MANAGEMENT,
  priority: 4,
  requiredVariables: ['actorName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
