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
    templateBase: 'center-created' as any,
    audiences: {
      ADMIN: {
        channels: {
          [NotificationChannel.IN_APP]: {
            requiredVariables: ['centerName'],
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
    templateBase: 'center-created' as any,
    audiences: {
      OWNER: {
        channels: {
          [NotificationChannel.EMAIL]: {
            subject: 'Your new center is ready!',
            requiredVariables: ['centerName', 'ownerName'],
          },
          [NotificationChannel.SMS]: {
            requiredVariables: ['centerName'],
          },
          [NotificationChannel.IN_APP]: {
            requiredVariables: ['centerName'],
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
    templateBase: 'center-created' as any,
    audiences: {
      OWNER: {
        channels: {
          [NotificationChannel.EMAIL]: {
            subject: 'Test Subject',
            requiredVariables: ['centerName'],
          },
          [NotificationChannel.SMS]: {
            requiredVariables: ['centerName'],
          },
          [NotificationChannel.WHATSAPP]: {
            requiredVariables: ['centerName'],
          },
          [NotificationChannel.IN_APP]: {
            requiredVariables: ['centerName'],
          },
        },
      },
    },
  } as NotificationManifest,
};



