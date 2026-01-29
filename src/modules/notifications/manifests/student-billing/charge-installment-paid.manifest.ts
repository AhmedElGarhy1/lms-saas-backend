import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CHARGE_INSTALLMENT_PAID notification
 *
 * Progress; avoid Push spam. TARGET only (student). In-App only.
 */
export const chargeInstallmentPaidManifest = {
  type: NotificationType.CHARGE_INSTALLMENT_PAID,
  group: NotificationGroup.MANAGEMENT,
  priority: 2,
  requiredVariables: [
    'className',
    'centerName',
    'amount',
    'chargeType',
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
