import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CHARGE_REFUNDED notification
 *
 * Important – money returned. Include refundReason so user knows why; reduces center inquiry calls.
 * TARGET only (student). Push + In-App.
 */
export const chargeRefundedManifest = {
  type: NotificationType.CHARGE_REFUNDED,
  group: NotificationGroup.MANAGEMENT,
  priority: 4,
  requiredVariables: [
    'className',
    'centerName',
    'amount',
    'chargeType',
    'actorName',
    'refundReason',
  ],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
