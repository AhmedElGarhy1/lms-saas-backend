import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CLASS_CREATED notification (INFORMATIONAL)
 *
 * Creator already knows - In-App only for audit trail
 * Multi-audience support:
 * - TEACHER: In-App only
 * - STAFF: In-App only
 */
export const classCreatedManifest = {
  type: NotificationType.CLASS_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2, // Low
  requiredVariables: ['className', 'teacherName', 'centerName'],
  audiences: {
    TEACHER: {
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
