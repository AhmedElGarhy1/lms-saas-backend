import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for USER_PROFILE_ACTIVATED notification
 *
 * User profile activated by staff. TARGET only. Push + In-App.
 */
export const userProfileActivatedManifest = {
  type: NotificationType.USER_PROFILE_ACTIVATED,
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
