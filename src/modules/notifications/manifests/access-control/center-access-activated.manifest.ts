import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_ACCESS_ACTIVATED notification
 *
 * Sent when center access is activated (user is unsuspended)
 * Multi-audience support:
 * - TARGET: User whose access was activated (WhatsApp + Push + In-App)
 * - OWNERS: Center owners for security monitoring (Push + In-App)
 */
export const centerAccessActivatedManifest = {
  type: NotificationType.CENTER_ACCESS_ACTIVATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 5, // Critical
  requiredVariables: ['name', 'centerName', 'actorName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'center_access_activated',
        },
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    OWNERS: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
