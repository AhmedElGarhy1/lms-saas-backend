import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_CREATED notification
 *
 * Sent when a new learning center is created
 * Multi-audience support:
 * - ADMIN: Receives in-app notification (uses creatorName, centerName)
 * - OWNER: Receives email and in-app notification (uses centerName, ownerName)
 *
 * All required variables: creatorName, centerName, ownerName
 * Each audience uses only the variables it needs
 */
export const centerCreatedManifest = {
  type: NotificationType.CENTER_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
  requiredVariables: ['creatorName', 'centerName', 'ownerName'],
  audiences: {
    ADMIN: {
      channels: {
        [NotificationChannel.IN_APP]: {
          // Template not needed - uses i18n system with NotificationType enum value as key
        },
      },
    },
    OWNER: {
      channels: {
        [NotificationChannel.IN_APP]: {
          // Template not needed - uses i18n system with NotificationType enum value as key
        },
      },
    },
  },
} as const satisfies NotificationManifest;
