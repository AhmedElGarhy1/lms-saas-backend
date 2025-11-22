import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for account lockout notification
 *
 * Sent when an account is locked due to multiple failed login attempts
 * Supports WhatsApp channel only
 */
export const accountLockedManifest: NotificationManifest = {
  type: NotificationType.ACCOUNT_LOCKED,
  group: NotificationGroup.SECURITY,
  priority: 4,
  requiresAudit: true,
  templateBase: 'auth/account-locked',
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.WHATSAPP]: {
          requiredVariables: ['lockoutDurationMinutes', 'lockoutDuration'],
        },
      },
    },
  },
} as const;

