import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CENTER_ACCESS_REVOKED notification
 *
 * Sent when center access is revoked (user is removed from center permanently)
 * Multi-audience support:
 * - TARGET: User who lost access (WhatsApp + Push)
 * - OWNERS: Center owners for security monitoring (Push + In-App)
 */
export const centerAccessRevokedManifest = {
  type: NotificationType.CENTER_ACCESS_REVOKED,
  group: NotificationGroup.SECURITY,
  priority: 4, // High
  requiredVariables: ['name', 'centerName', 'actorName', 'profileType'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          template: 'center_access_revoked',
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
