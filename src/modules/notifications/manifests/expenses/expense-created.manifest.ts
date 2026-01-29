import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for EXPENSE_CREATED notification
 *
 * Operational; money out. OWNERS + STAFF (branch). In-App only.
 */
export const expenseCreatedManifest = {
  type: NotificationType.EXPENSE_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
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
        [NotificationChannel.IN_APP]: {},
      },
    },
    STAFF: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
