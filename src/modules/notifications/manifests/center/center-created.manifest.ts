import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_CREATED notification
 *
 * Sent when a new learning center is created
 * Multi-audience support:
 * - ADMIN: Receives in-app notification
 * - OWNER: Receives email and in-app notification
 *
 * Template variables:
 * - ADMIN: creatorName, centerName
 * - OWNER: centerName, ownerName
 */
export const centerCreatedManifest: NotificationManifest = {
  type: NotificationType.CENTER_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
  requiresAudit: true,
  templateBase: 'center-created',
  audiences: {
    ADMIN: {
      channels: {
        [NotificationChannel.IN_APP]: {
          requiredVariables: ['creatorName', 'centerName'],
        },
      },
    },
    OWNER: {
      channels: {
        [NotificationChannel.EMAIL]: {
          subject: 'Your new center is ready!',
          requiredVariables: ['centerName', 'ownerName'],
        },
        [NotificationChannel.IN_APP]: {
          requiredVariables: ['centerName'],
        },
      },
    },
  },
} as const;
