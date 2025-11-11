import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationRouterService } from './notification-router.service';
import { NotificationSenderService } from '../notification-sender.service';
import { InAppNotificationService } from '../in-app-notification.service';
import { NotificationRenderer } from '../../renderer/notification-renderer.service';
import { NotificationManifestResolver } from '../../manifests/registry/notification-manifest-resolver.service';
import { NotificationIdempotencyCacheService } from '../notification-idempotency-cache.service';
import { NotificationMetricsService } from '../notification-metrics.service';
import { ChannelRetryStrategyService } from '../channel-retry-strategy.service';
import { RecipientValidationService } from '../recipient-validation.service';
import { PayloadBuilderService } from '../payload-builder.service';
import { Logger } from '@nestjs/common';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { FakeQueue } from '../../test/fakes/fake-queue';
import {
  createMockRecipientInfo,
  createMockNotificationManifest,
  createMockLoggerService,
  createMockMetricsService,
  createMockNotificationContext,
  createMockEmailPayload,
  createMockSmsPayload,
} from '../../test/helpers';
import { TestEnvGuard } from '../../test/helpers/test-env-guard';
import { NotificationProcessingContext } from '../pipeline/notification-pipeline.service';
import { RenderedNotification } from '../../manifests/types/manifest.types';

describe('NotificationRouterService', () => {
  let service: NotificationRouterService;
  let fakeQueue: FakeQueue;
  let mockSenderService: jest.Mocked<NotificationSenderService>;
  let mockInAppService: jest.Mocked<InAppNotificationService>;
  let mockRenderer: jest.Mocked<NotificationRenderer>;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;
  let mockIdempotencyCache: jest.Mocked<NotificationIdempotencyCacheService>;
  let mockMetrics: NotificationMetricsService;
  let mockRetryStrategy: jest.Mocked<ChannelRetryStrategyService>;
  let mockLogger: Logger;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    fakeQueue = new FakeQueue();
    mockLogger = createMockLoggerService();
    mockMetrics = createMockMetricsService();

    mockSenderService = {
      send: jest.fn().mockResolvedValue([
        { channel: NotificationChannel.EMAIL, success: true },
      ]),
    } as any;

    mockInAppService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<InAppNotificationService>;

    mockRenderer = {
      render: jest.fn().mockResolvedValue({
        content: '<p>Rendered content</p>',
        subject: 'Test Subject',
        metadata: { template: 'test-template', locale: 'en' },
      } as RenderedNotification),
    } as any;

    mockManifestResolver = {
      getManifest: jest.fn().mockReturnValue(createMockNotificationManifest()),
      getChannelConfig: jest.fn().mockReturnValue({
        requiredVariables: [],
        template: 'test-template',
      }),
    } as any;

    mockIdempotencyCache = {
      checkAndSet: jest.fn().mockResolvedValue(false), // Not sent yet
      markSent: jest.fn().mockResolvedValue(undefined),
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockRetryStrategy = {
      getRetryConfig: jest.fn().mockReturnValue({
        maxAttempts: 3,
        backoffType: 'exponential',
        backoffDelay: 2000,
      }),
    } as any;

    const mockRecipientValidator = {
      determineAndValidateRecipient: jest.fn().mockImplementation(
        (channel, recipient, phone, userId) => {
          if (channel === NotificationChannel.EMAIL) {
            return recipient?.includes('@') ? recipient : null;
          }
          if (channel === NotificationChannel.SMS || channel === NotificationChannel.WHATSAPP) {
            return phone || null;
          }
          if (channel === NotificationChannel.IN_APP) {
            return userId;
          }
          return recipient || phone || null;
        },
      ),
    } as any;

    const mockPayloadBuilder = {
      buildBasePayload: jest.fn().mockImplementation(
        (recipient, channel, type, manifest, locale, centerId, userId, profileType, profileId, correlationId) => ({
          recipient,
          channel,
          type,
          group: manifest.group,
          locale,
          centerId,
          userId,
          profileType: profileType ?? null,
          profileId: profileId ?? null,
          correlationId,
        }),
      ),
      buildPayload: jest.fn().mockImplementation((channel, basePayload, rendered) => {
        if (channel === NotificationChannel.EMAIL && !rendered.subject) {
          return null;
        }
        return {
          ...basePayload,
          ...(rendered.subject ? { subject: rendered.subject } : {}),
          data: {
            content: rendered.content,
            template: rendered.metadata?.template || '',
          },
        };
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRouterService,
        {
          provide: getQueueToken('notifications'),
          useValue: fakeQueue,
        },
        {
          provide: NotificationSenderService,
          useValue: mockSenderService,
        },
        {
          provide: InAppNotificationService,
          useValue: mockInAppService,
        },
        {
          provide: NotificationRenderer,
          useValue: mockRenderer,
        },
        {
          provide: NotificationManifestResolver,
          useValue: mockManifestResolver,
        },
        {
          provide: NotificationIdempotencyCacheService,
          useValue: mockIdempotencyCache,
        },
        {
          provide: NotificationMetricsService,
          useValue: mockMetrics,
        },
        {
          provide: ChannelRetryStrategyService,
          useValue: mockRetryStrategy,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationRouterService>(NotificationRouterService);
  });

  afterEach(() => {
    fakeQueue.clear();
    jest.clearAllMocks();
  });

  describe('route()', () => {
    it('should route notification to EMAIL channel', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });

      await service.route(context);

      expect(mockRenderer.render).toHaveBeenCalledWith(
        context.eventName,
        NotificationChannel.EMAIL,
        context.templateData,
        context.locale,
        context.audience,
      );
      expect(mockSenderService.send).toHaveBeenCalled();
    });

    it('should route notification to IN_APP channel', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.IN_APP],
      });

      await service.route(context);

      expect(mockSenderService.send).toHaveBeenCalled();
    });

    it('should route to multiple channels', async () => {
      const context = createMockNotificationContext({
        finalChannels: [
          NotificationChannel.EMAIL,
          NotificationChannel.SMS,
          NotificationChannel.IN_APP,
        ],
      });

      await service.route(context);

      expect(mockRenderer.render).toHaveBeenCalledTimes(3);
      expect(mockSenderService.send).toHaveBeenCalledTimes(3); // EMAIL, SMS, and IN_APP
    });

    it('should check idempotency before sending', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });

      await service.route(context);

      expect(mockIdempotencyCache.checkAndSet).toHaveBeenCalled();
    });

    it('should skip sending if already sent (idempotency)', async () => {
      mockIdempotencyCache.checkAndSet = jest.fn().mockResolvedValue(true); // Already sent

      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });

      await service.route(context);

      expect(mockSenderService.send).not.toHaveBeenCalled();
    });

    it('should validate recipient email for EMAIL channel', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
        recipient: 'invalid-email', // Invalid email
      });

      await service.route(context);

      // Should skip invalid recipient
      expect(mockSenderService.send).not.toHaveBeenCalled();
    });

    it('should validate recipient phone for SMS channel', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.SMS],
        phone: 'invalid-phone', // Invalid phone
      });

      await service.route(context);

      // Should skip invalid recipient
      expect(mockSenderService.send).not.toHaveBeenCalled();
    });

    it('should mark as sent after successful send', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });

      await service.route(context);

      expect(mockIdempotencyCache.markSent).toHaveBeenCalled();
    });

    it('should handle rendering errors gracefully', async () => {
      mockRenderer.render = jest
        .fn()
        .mockRejectedValue(new Error('Rendering failed'));

      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });

      await service.route(context);

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle send errors gracefully', async () => {
      mockSenderService.send = jest.fn().mockResolvedValue([
        { channel: NotificationChannel.EMAIL, success: false, error: 'Send failed' },
      ]);

      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });

      await service.route(context);

      // Warning should be logged
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('enqueueNotifications()', () => {
    it('should enqueue notifications to queue', async () => {
      const payloads = [
        createMockEmailPayload(),
        createMockSmsPayload(),
      ];

      await service.enqueueNotifications(payloads);

      expect(fakeQueue.getJobCount()).toBe(2);
    });

    it('should use bulk enqueue for multiple notifications', async () => {
      const payloads = Array.from({ length: 10 }, () =>
        createMockEmailPayload(),
      );

      await service.enqueueNotifications(payloads);

      expect(fakeQueue.getJobCount()).toBe(10);
    });

    it('should set retry configuration from ChannelRetryStrategyService', async () => {
      const payload = createMockEmailPayload();

      await service.enqueueNotifications([payload]);

      expect(mockRetryStrategy.getRetryConfig).toHaveBeenCalledWith(
        NotificationChannel.EMAIL,
      );
    });

    it('should handle queue errors gracefully', async () => {
      // Mock queue to throw error
      fakeQueue.add = jest.fn().mockRejectedValue(new Error('Queue error'));

      const payload = createMockEmailPayload();

      await service.enqueueNotifications([payload]);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('buildPayload()', () => {
    it('should build EMAIL payload correctly', () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });
      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.EMAIL,
        content: '<p>HTML content</p>',
        subject: 'Email Subject',
        metadata: { template: 'email-template', locale: 'en' },
      };

      const payload = (service as any).buildPayload(
        context,
        NotificationChannel.EMAIL,
        rendered,
      );

      expect(payload.channel).toBe(NotificationChannel.EMAIL);
      expect(payload.subject).toBe('Email Subject');
      expect(payload.data.html).toBe('<p>HTML content</p>');
    });

    it('should build SMS payload correctly', () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.SMS],
        phone: '+1234567890',
      });
      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.SMS,
        content: 'SMS content',
        metadata: { template: 'sms-template', locale: 'en' },
      };

      const payload = (service as any).buildPayload(
        context,
        NotificationChannel.SMS,
        rendered,
      );

      expect(payload.channel).toBe(NotificationChannel.SMS);
      expect(payload.recipient).toBe('+1234567890');
      expect(payload.data.content).toBe('SMS content');
    });

    it('should build IN_APP payload correctly', () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.IN_APP],
      });
      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.IN_APP,
        content: { title: 'Title', message: 'Message' },
        metadata: { template: 'inapp-template', locale: 'en' },
      };

      const payload = (service as any).buildPayload(
        context,
        NotificationChannel.IN_APP,
        rendered,
      );

      expect(payload.channel).toBe(NotificationChannel.IN_APP);
      expect(payload.title).toBe('Title');
      expect(payload.data.message).toBe('Message');
    });
  });
});

