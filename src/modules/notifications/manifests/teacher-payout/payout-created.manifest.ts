import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for PAYOUT_CREATED notification
 *
 * Record created; operational. TARGET only (teacher). In-App only.
 */
export const payoutCreatedManifest = {
  type: NotificationType.PAYOUT_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
  requiredVariables: ['className', 'centerName', 'amount', 'unitType', 'actorName'],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
