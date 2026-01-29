import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_RESTORED notification
 *
 * Sent when a center is restored from soft-delete. Administrative action.
 * In-App only. Audiences: OWNERS (center owners).
 */
export const centerRestoredManifest = {
  type: NotificationType.CENTER_RESTORED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
  requiredVariables: ['centerName', 'actorName'],
  audiences: {
    OWNERS: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
