import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for PAYOUT_INSTALLMENT_PAID notification
 *
 * Partial payment; avoid spam. TARGET only (teacher). In-App only.
 */
export const payoutInstallmentPaidManifest = {
  type: NotificationType.PAYOUT_INSTALLMENT_PAID,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
  requiredVariables: [
    'className',
    'centerName',
    'amount',
    'unitType',
    'actorName',
    'installmentAmount',
    'remainingAmount',
  ],
  audiences: {
    TARGET: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
