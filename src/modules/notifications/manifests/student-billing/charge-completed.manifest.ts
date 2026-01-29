import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CHARGE_COMPLETED notification
 *
 * Fully paid – user should know. TARGET only (student). Push + In-App.
 */
export const chargeCompletedManifest = {
  type: NotificationType.CHARGE_COMPLETED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
  requiredVariables: ['className', 'centerName', 'amount', 'chargeType', 'actorName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
