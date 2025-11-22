import { NotificationManifest } from '../../manifests/types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Sample manifests for testing
 */
export const testManifests = {
  /**
   * Simple manifest with single channel
   */
  simpleInApp: {
    type: NotificationType.CENTER_CREATED,
    group: NotificationGroup.MANAGEMENT,
    priority: 3,
    requiredVariables: ['centerName'],
    audiences: {
      ADMIN: {
        channels: {
          [NotificationChannel.IN_APP]: {
            template: 'in-app/center-created',
          },
        },
      },
    },
  } as NotificationManifest,

  /**
   * Manifest with multiple channels
   */
  multiChannel: {
    type: NotificationType.CENTER_CREATED,
    group: NotificationGroup.MANAGEMENT,
    priority: 3,
    requiredVariables: ['centerName', 'ownerName'],
    audiences: {
      OWNER: {
        channels: {
          [NotificationChannel.EMAIL]: {
            template: 'email/center-created',
            subject: 'Your new center is ready!',
          },
          [NotificationChannel.SMS]: {
            template: 'sms/center-created',
          },
          [NotificationChannel.IN_APP]: {
            template: 'in-app/center-created',
          },
        },
      },
    },
  } as NotificationManifest,

  /**
   * Manifest with all channels
   */
  allChannels: {
    type: NotificationType.CENTER_CREATED,
    group: NotificationGroup.MANAGEMENT,
    priority: 3,
    requiredVariables: ['centerName'],
    audiences: {
      OWNER: {
        channels: {
          [NotificationChannel.EMAIL]: {
            template: 'email/center-created',
            subject: 'Test Subject',
          },
          [NotificationChannel.SMS]: {
            template: 'sms/center-created',
          },
          [NotificationChannel.WHATSAPP]: {
            template: 'center_created',
          },
          [NotificationChannel.IN_APP]: {
            template: 'in-app/center-created',
          },
        },
      },
    },
  } as NotificationManifest,
};
