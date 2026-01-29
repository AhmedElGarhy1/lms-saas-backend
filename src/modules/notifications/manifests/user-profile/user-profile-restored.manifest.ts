import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for USER_PROFILE_RESTORED notification
 *
 * User profile restored from soft-delete. TARGET only. Push + In-App.
 */
export const userProfileRestoredManifest = {
  type: NotificationType.USER_PROFILE_RESTORED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
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
