import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for PAYOUT_PAID notification
 *
 * Money transferred – teacher must know. TARGET only (teacher). Push + In-App.
 */
export const payoutPaidManifest = {
  type: NotificationType.PAYOUT_PAID,
  group: NotificationGroup.MANAGEMENT,
  priority: 4,
  requiredVariables: ['className', 'centerName', 'amount', 'unitType', 'actorName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
