import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Manifest for CLASS_UPDATED notification (INFORMATIONAL)
 *
 * Minor changes don't need Push - In-App for all
 * Multi-audience support:
 * - TEACHER: In-App only
 * - STAFF: In-App only
 * - STUDENTS: In-App only
 * - PARENTS: In-App only
 */
export const classUpdatedManifest = {
  type: NotificationType.CLASS_UPDATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 2, // Low
  requiredVariables: ['className', 'centerName', 'actorName'],
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
    STUDENTS: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
    PARENTS: {
      channels: {
        [NotificationChannel.IN_APP]: {},
      },
    },
  },
} as const satisfies NotificationManifest;
