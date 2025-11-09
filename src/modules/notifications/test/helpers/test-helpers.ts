import { faker } from '@faker-js/faker';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationManifest } from '../../manifests/types/manifest.types';
import { NotificationGroup } from '../../enums/notification-group.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  EmailNotificationPayload,
  SmsNotificationPayload,
  WhatsAppNotificationPayload,
  InAppNotificationPayload,
  NotificationPayload,
} from '../../types/notification-payload.interface';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationMetricsService } from '../../services/notification-metrics.service';
import { DataSource } from 'typeorm';
import { NotificationProcessingContext } from '../../services/pipeline/notification-pipeline.service';
import { createUserId, createCorrelationId } from '../../types/branded-types';

/**
 * Creates a mock RecipientInfo for testing
 */
export function createMockRecipientInfo(
  overrides?: Partial<RecipientInfo>,
): RecipientInfo {
  return {
    userId: faker.string.uuid(),
    profileId: faker.string.uuid(),
    email: faker.internet.email(),
    phone: faker.phone.number('+2##########'),
    locale: faker.helpers.arrayElement(['en', 'ar']),
    centerId: faker.string.uuid(),
    profileType: faker.helpers.arrayElement([
      ProfileType.ADMIN,
      ProfileType.STAFF,
      ProfileType.PARENT,
    ]),
    ...overrides,
  };
}

/**
 * Creates a mock notification event for testing
 */
export function createMockNotificationEvent(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    centerId: 'center-123',
    centerName: 'Test Center',
    userId: 'user-123',
    ...overrides,
  };
}

/**
 * Creates a mock EmailNotificationPayload for testing
 */
export function createMockEmailPayload(
  overrides?: Partial<EmailNotificationPayload>,
): EmailNotificationPayload {
  return {
    type: NotificationType.CENTER_CREATED,
    group: NotificationGroup.MANAGEMENT,
    channel: NotificationChannel.EMAIL,
    recipient: 'test@example.com',
    subject: 'Test Subject',
    locale: 'en',
    userId: createUserId('user-123'),
    data: {
      html: '<p>Test content</p>',
      content: 'Test content',
    },
    ...overrides,
  };
}

/**
 * Creates a mock SmsNotificationPayload for testing
 */
export function createMockSmsPayload(
  overrides?: Partial<SmsNotificationPayload>,
): SmsNotificationPayload {
  return {
    type: NotificationType.CENTER_CREATED,
    group: NotificationGroup.MANAGEMENT,
    channel: NotificationChannel.SMS,
    recipient: '+1234567890',
    locale: 'en',
    userId: createUserId('user-123'),
    data: {
      content: 'Test SMS content',
    },
    ...overrides,
  };
}

/**
 * Creates a mock WhatsAppNotificationPayload for testing
 */
export function createMockWhatsAppPayload(
  overrides?: Partial<WhatsAppNotificationPayload>,
): WhatsAppNotificationPayload {
  return {
    type: NotificationType.CENTER_CREATED,
    group: NotificationGroup.MANAGEMENT,
    channel: NotificationChannel.WHATSAPP,
    recipient: '+1234567890',
    locale: 'en',
    userId: createUserId('user-123'),
    data: {
      content: 'Test WhatsApp content',
    },
    ...overrides,
  };
}

/**
 * Creates a mock InAppNotificationPayload for testing
 */
export function createMockInAppPayload(
  overrides?: Partial<InAppNotificationPayload>,
): InAppNotificationPayload {
  return {
    type: NotificationType.CENTER_CREATED,
    group: NotificationGroup.MANAGEMENT,
    channel: NotificationChannel.IN_APP,
    recipient: 'user-123',
    title: 'Test Title',
    locale: 'en',
    userId: createUserId('user-123'),
    data: {
      message: 'Test message',
    },
    ...overrides,
  };
}

/**
 * Creates a mock NotificationManifest for testing
 */
export function createMockNotificationManifest(
  overrides?: Partial<NotificationManifest>,
): NotificationManifest {
  return {
    type: NotificationType.CENTER_CREATED,
    group: NotificationGroup.MANAGEMENT,
    priority: 3,
    templateBase: 'center-created' as TemplateBasePath,
    audiences: {
      ADMIN: {
        channels: {
          [NotificationChannel.IN_APP]: {
            requiredVariables: ['centerName'],
          },
        },
      },
      OWNER: {
        channels: {
          [NotificationChannel.EMAIL]: {
            subject: 'Test Subject',
            requiredVariables: ['centerName'],
          },
          [NotificationChannel.SMS]: {
            requiredVariables: ['centerName'],
          },
        },
      },
    },
    ...overrides,
  };
}

/**
 * Creates a mock LoggerService for testing
 */
export function createMockLoggerService(): LoggerService {
  return {
    log: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as LoggerService;
}

/**
 * Creates a mock NotificationMetricsService for testing
 */
export function createMockMetricsService(): NotificationMetricsService {
  return {
    incrementSent: jest.fn().mockResolvedValue(undefined),
    incrementFailed: jest.fn().mockResolvedValue(undefined),
    recordLatency: jest.fn().mockResolvedValue(undefined),
    getMetrics: jest.fn().mockResolvedValue({}),
  } as unknown as NotificationMetricsService;
}

/**
 * Creates a mock DataSource for testing
 */
export function createMockDataSource(): Partial<DataSource> {
  return {
    transaction: jest.fn().mockImplementation(
      async (runInTransaction: (entityManager: any) => Promise<any>) => {
        return runInTransaction({} as any);
      },
    ) as any,
    getRepository: jest.fn(),
  } as Partial<DataSource>;
}

/**
 * Creates a mock NotificationProcessingContext for testing
 */
export function createMockNotificationContext(
  overrides?: Partial<NotificationProcessingContext>,
): NotificationProcessingContext {
  const event = createMockNotificationEvent();
  const manifest = createMockNotificationManifest();
  const recipientInfo = createMockRecipientInfo();

  return {
    eventName: NotificationType.CENTER_CREATED,
    event,
    mapping: { type: NotificationType.CENTER_CREATED },
    manifest,
    audience: 'OWNER',
    correlationId: 'test-corr-id',
    userId: recipientInfo.userId,
    recipient: recipientInfo.email || recipientInfo.phone || '',
    phone: recipientInfo.phone,
    centerId: recipientInfo.centerId ?? undefined,
    locale: recipientInfo.locale,
    profileType: recipientInfo.profileType,
    profileId: recipientInfo.profileId,
    requestedChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    enabledChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    finalChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    templateData: {
      ...event,
      userId: recipientInfo.userId,
      email: recipientInfo.email,
      phone: recipientInfo.phone,
      locale: recipientInfo.locale,
      centerId: recipientInfo.centerId ?? undefined,
      profileType: recipientInfo.profileType,
      profileId: recipientInfo.profileId,
    } as any,
    ...overrides,
  };
}

