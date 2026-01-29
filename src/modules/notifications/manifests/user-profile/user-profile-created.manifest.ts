import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for USER_PROFILE_CREATED notification
 *
 * User profile created. TARGET only. In-App only (avoid duplication with access-control flows).
 */
export const userProfileCreatedManifest = {
  type: NotificationType.USER_PROFILE_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
  requiredVariables: ['actorName', 'profileType', 'centerName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
