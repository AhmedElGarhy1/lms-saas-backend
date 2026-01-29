import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_ACCESS_GRANTED notification
 *
 * Sent when new center access is granted (user joins center for the first time)
 * Multi-audience support:
 * - TARGET: User who got access (WhatsApp + Push + In-App)
 * - OWNERS: Center owners for security monitoring (Push + In-App)
 */
export const centerAccessGrantedManifest = {
  type: NotificationType.CENTER_ACCESS_GRANTED,
  group: NotificationGroup.MANAGEMENT,
  priority: 4, // High
  requiredVariables: ['name', 'centerName', 'actorName', 'profileType'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'center_access_granted',
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
