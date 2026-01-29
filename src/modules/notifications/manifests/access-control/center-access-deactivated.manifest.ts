import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_ACCESS_DEACTIVATED notification
 *
 * Sent when center access is deactivated (user is suspended)
 * Multi-audience support:
 * - TARGET: User whose access was deactivated (WhatsApp + Push)
 * - OWNERS: Center owners for security monitoring (Push + In-App)
 */
export const centerAccessDeactivatedManifest = {
  type: NotificationType.CENTER_ACCESS_DEACTIVATED,
  group: NotificationGroup.SECURITY,
  priority: 5, // Critical
  requiredVariables: ['name', 'centerName', 'actorName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'center_access_deactivated',
        },
        [NotificationChannel.PUSH]: {},
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
