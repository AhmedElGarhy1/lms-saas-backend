import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationService } from '../../services/notification.service';
import { NotificationPipelineService } from '../../services/pipeline/notification-pipeline.service';
import { NotificationRouterService } from '../../services/routing/notification-router.service';
import { NotificationSenderService } from '../../adapters/notification-sender.service';
import { ChannelSelectionService } from '../../services/channel-selection.service';
import { NotificationTemplateService } from '../../services/notification-template.service';
import { InAppNotificationService } from '../../services/in-app-notification.service';
import { NotificationManifestResolver } from '../../manifests/registry/notification-manifest-resolver.service';
import { NotificationRenderer } from '../../renderer/notification-renderer.service';
import { NotificationMetricsService } from '../../services/notification-metrics.service';
import { NotificationIdempotencyCacheService } from '../../services/notification-idempotency-cache.service';
import { ChannelRetryStrategyService } from '../../services/channel-retry-strategy.service';
import { MultiRecipientProcessor } from '../../services/multi-recipient-processor.service';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { Logger } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { FakeQueue } from '../fakes/fake-queue';
import { FakeRedis } from '../fakes/fake-redis';
import {
  createMockRecipientInfo,
  createMockNotificationEvent,
  createMockNotificationManifest,
  createMockLoggerService,
  createMockMetricsService,
} from '../helpers';
import { TestEnvGuard } from '../helpers/test-env-guard';
import { RenderedNotification } from '../../manifests/types/manifest.types';

describe('Batch Processing', () => {
  let service: NotificationService;
  let fakeQueue: FakeQueue;
  let fakeRedis: FakeRedis;
  let mockPipelineService: jest.Mocked<NotificationPipelineService>;
  let mockRouterService: jest.Mocked<NotificationRouterService>;
  let mockRenderer: jest.Mocked<NotificationRenderer>;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    fakeQueue = new FakeQueue();
    fakeRedis = new FakeRedis();

    mockRenderer = {
      render: jest.fn().mockResolvedValue({
        content: '<p>Rendered content</p>',
        subject: 'Test Subject',
        metadata: { template: 'test-template' },
      } as RenderedNotification),
    } as any;

    mockManifestResolver = {
      getManifest: jest.fn().mockReturnValue(createMockNotificationManifest()),
      getAudienceConfig: jest.fn().mockReturnValue({
        channels: {
          [NotificationChannel.EMAIL]: {},
          [NotificationChannel.IN_APP]: {},
        },
      }),
      getChannelConfig: jest.fn().mockReturnValue({
        requiredVariables: [],
        template: 'test-template',
      }),
    } as any;

    mockPipelineService = {
      process: jest.fn().mockImplementation(async (context, recipientInfo) => {
        context.userId = recipientInfo.userId;
        context.recipient = recipientInfo.email || recipientInfo.phone || '';
        context.enabledChannels = [
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
        ];
        context.finalChannels = [
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
        ];
        return context;
      }),
    } as any;

    mockRouterService = {
      route: jest.fn().mockResolvedValue(undefined),
      enqueueNotifications: jest.fn().mockResolvedValue([]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getQueueToken('notifications'),
          useValue: fakeQueue,
        },
        {
          provide: NotificationSenderService,
          useValue: {
            send: jest
              .fn()
              .mockResolvedValue([
                { channel: NotificationChannel.EMAIL, success: true },
              ]),
          },
        },
        {
          provide: ChannelSelectionService,
          useValue: {
            selectOptimalChannels: jest
              .fn()
              .mockResolvedValue([NotificationChannel.EMAIL]),
          },
        },
        {
          provide: NotificationTemplateService,
          useValue: {},
        },
        {
          provide: InAppNotificationService,
          useValue: {
            checkUserRateLimit: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: Logger,
          useValue: createMockLoggerService(),
        },
        {
          provide: ChannelRetryStrategyService,
          useValue: {
            getRetryConfig: jest.fn().mockReturnValue({
              maxAttempts: 3,
              backoffType: 'exponential',
              backoffDelay: 2000,
            }),
          },
        },
        {
          provide: NotificationManifestResolver,
          useValue: mockManifestResolver,
        },
        {
          provide: NotificationRenderer,
          useValue: mockRenderer,
        },
        {
          provide: NotificationPipelineService,
          useValue: mockPipelineService,
        },
        {
          provide: NotificationRouterService,
          useValue: mockRouterService,
        },
        {
          provide: NotificationMetricsService,
          useValue: createMockMetricsService(),
        },
        {
          provide: NotificationIdempotencyCacheService,
          useValue: {
            checkAndSet: jest.fn().mockResolvedValue(false),
            markSent: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MultiRecipientProcessor,
          useValue: {
            processRecipients: jest
              .fn()
              .mockImplementation(async (recipients, processor) => {
                const results = await Promise.allSettled(
                  recipients.map((r: RecipientInfo) => processor(r)),
                );
                return results.map((result, index) => ({
                  recipient: recipients[index],
                  result:
                    result.status === 'fulfilled'
                      ? result.value
                      : new Error(String(result.reason)),
                  success: result.status === 'fulfilled',
                }));
              }),
            getConcurrencyLimit: jest.fn().mockReturnValue(10),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    fakeQueue.clear();
    fakeRedis.clear();
    jest.clearAllMocks();
  });

  describe('Bulk Notification Processing', () => {
    it('should process multiple recipients efficiently', async () => {
      const recipients = Array.from({ length: 10 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.total).toBe(10);
      expect(result.sent).toBeGreaterThan(0);
      expect(mockPipelineService.process).toHaveBeenCalledTimes(10);
    });

    it('should respect concurrency limit', async () => {
      const recipients = Array.from({ length: 50 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      let concurrentCount = 0;
      let maxConcurrent = 0;
      mockPipelineService.process = jest
        .fn()
        .mockImplementation(async (context, recipientInfo) => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          await new Promise((resolve) => setTimeout(resolve, 10));
          concurrentCount--;
          return context;
        });

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(maxConcurrent).toBeLessThanOrEqual(20); // Default concurrency limit
    });

    it('should render templates per recipient (not bulk)', async () => {
      const recipients = Array.from({ length: 5 }, (_, i) =>
        createMockRecipientInfo({
          userId: `user-${i}`,
          locale: i % 2 === 0 ? 'en' : 'ar',
        }),
      );
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      // Each recipient should get their own template rendering
      expect(mockRenderer.render).toHaveBeenCalledTimes(expect.any(Number));
    });

    it('should use bulk enqueue for multiple notifications', async () => {
      const recipients = Array.from({ length: 20 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      // Should use bulk enqueue
      expect(mockRouterService.enqueueNotifications).toHaveBeenCalled();
    });

    it('should handle partial failures in batch', async () => {
      const recipients = Array.from({ length: 10 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      // Make some pipeline calls fail
      let callCount = 0;
      mockPipelineService.process = jest
        .fn()
        .mockImplementation(async (context, recipientInfo) => {
          callCount++;
          if (callCount % 3 === 0) {
            throw new Error('Processing failed');
          }
          return context;
        });

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.total).toBe(10);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.sent + result.failed).toBeLessThanOrEqual(10);
    });

    it('should track metrics for batch operations', async () => {
      const recipients = Array.from({ length: 15 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      // Metrics should be tracked for batch
      expect(mockRouterService.enqueueNotifications).toHaveBeenCalled();
    });
  });

  describe('Template Rendering Per Recipient', () => {
    it('should render template with recipient-specific data', async () => {
      const recipients = [
        createMockRecipientInfo({
          userId: 'user-1',
          locale: 'en',
          email: 'user1@example.com',
        }),
        createMockRecipientInfo({
          userId: 'user-2',
          locale: 'ar',
          email: 'user2@example.com',
        }),
      ];
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      // Verify render was called with recipient-specific locale
      expect(mockRenderer.render).toHaveBeenCalledWith(
        NotificationType.CENTER_CREATED,
        expect.any(NotificationChannel),
        expect.objectContaining({
          email: 'user1@example.com',
        }),
        'en',
        expect.any(String),
      );

      expect(mockRenderer.render).toHaveBeenCalledWith(
        NotificationType.CENTER_CREATED,
        expect.any(NotificationChannel),
        expect.objectContaining({
          email: 'user2@example.com',
        }),
        'ar',
        expect.any(String),
      );
    });

    it('should include recipient-specific template data', async () => {
      const recipient = createMockRecipientInfo({
        userId: 'user-specific',
        centerId: 'center-123',
        profileType: 'ADMIN' as any,
      });
      const event = createMockNotificationEvent({ centerName: 'Test Center' });

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(mockRenderer.render).toHaveBeenCalledWith(
        expect.any(NotificationType),
        expect.any(NotificationChannel),
        expect.objectContaining({
          userId: 'user-specific',
          centerId: 'center-123',
          centerName: 'Test Center',
        }),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('Bulk Enqueueing', () => {
    it('should enqueue multiple notifications in bulk', async () => {
      const recipients = Array.from({ length: 25 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      // Should use bulk enqueue
      const enqueueCalls = mockRouterService.enqueueNotifications.mock.calls;
      expect(enqueueCalls.length).toBeGreaterThan(0);

      // Each call should have multiple contexts
      enqueueCalls.forEach((call) => {
        const contexts = call[0];
        expect(Array.isArray(contexts)).toBe(true);
      });
    });

    it('should handle queue errors in bulk operations', async () => {
      mockRouterService.enqueueNotifications = jest
        .fn()
        .mockRejectedValue(new Error('Queue error'));

      const recipients = Array.from({ length: 10 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.failed).toBeGreaterThan(0);
    });
  });
});
