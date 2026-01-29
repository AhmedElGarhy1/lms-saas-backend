import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for EXPENSE_REFUNDED notification
 *
 * Money returned; higher visibility. OWNERS + STAFF (branch). Push + In-App.
 */
export const expenseRefundedManifest = {
  type: NotificationType.EXPENSE_REFUNDED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
  requiredVariables: [
    'expenseTitle',
    'amount',
    'centerName',
    'branchName',
    'actorName',
    'category',
  ],
  audiences: {
    OWNERS: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
    STAFF: {
      channels: {
        [NotificationChannel.PUSH]: {},
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
