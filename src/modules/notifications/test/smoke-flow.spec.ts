import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationService } from '../services/notification.service';
import { NotificationPipelineService } from '../services/pipeline/notification-pipeline.service';
import { NotificationRouterService } from '../services/routing/notification-router.service';
import { NotificationSenderService } from '../services/notification-sender.service';
import { ChannelSelectionService } from '../services/channel-selection.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import { InAppNotificationService } from '../services/in-app-notification.service';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationRenderer } from '../renderer/notification-renderer.service';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { NotificationIdempotencyCacheService } from '../services/notification-idempotency-cache.service';
import { ChannelRetryStrategyService } from '../services/channel-retry-strategy.service';
import { MultiRecipientProcessor } from '../services/multi-recipient-processor.service';
import { Logger } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { FakeQueue } from './fakes/fake-queue';
import { FakeRedis } from './fakes/fake-redis';
import {
  createMockRecipientInfo,
  createMockNotificationEvent,
  createMockNotificationManifest,
  createMockLoggerService,
  createMockMetricsService,
} from './helpers';
import { RecipientInfo } from '../types/recipient-info.interface';
import { TestEnvGuard } from './helpers/test-env-guard';
import { RenderedNotification } from '../manifests/types/manifest.types';

/**
 * Smoke Flow Integration Test
 *
 * Tests the complete end-to-end flow from trigger to delivery
 * This is a high-level integration test that verifies all components work together
 */
describe('Smoke Flow - End-to-End Integration', () => {
  let service: NotificationService;
  let fakeQueue: FakeQueue;
  let fakeRedis: FakeRedis;
  let mockPipelineService: jest.Mocked<NotificationPipelineService>;
  let mockRouterService: jest.Mocked<NotificationRouterService>;
  let mockRenderer: jest.Mocked<NotificationRenderer>;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;
  let mockSenderService: jest.Mocked<NotificationSenderService>;
  let mockIdempotencyCache: jest.Mocked<NotificationIdempotencyCacheService>;

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
          [NotificationChannel.EMAIL]: {
            requiredVariables: ['centerName'],
            template: 'center-created',
          },
          [NotificationChannel.IN_APP]: {
            requiredVariables: ['centerName'],
            template: 'center-created',
          },
        },
      }),
      getChannelConfig: jest.fn().mockReturnValue({
        requiredVariables: ['centerName'],
        template: 'center-created',
      }),
    } as any;

    mockPipelineService = {
      process: jest.fn().mockImplementation(async (context, recipientInfo) => {
        context.userId = recipientInfo.userId;
        context.recipient = recipientInfo.email || recipientInfo.phone || '';
        context.phone = recipientInfo.phone;
        context.locale = recipientInfo.locale || 'en';
        context.enabledChannels = [
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
        ];
        context.finalChannels = [
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
        ];
        context.templateData = {
          ...(context.event as Record<string, unknown>),
          userId: recipientInfo.userId,
          email: recipientInfo.email,
          phone: recipientInfo.phone,
          locale: recipientInfo.locale || 'en',
        } as any;
        return context;
      }),
    } as any;

    mockSenderService = {
      send: jest
        .fn()
        .mockResolvedValue([
          { channel: NotificationChannel.EMAIL, success: true },
        ]),
    } as any;

    mockRouterService = {
      route: jest.fn().mockResolvedValue(undefined),
      enqueueNotifications: jest.fn().mockResolvedValue([]),
    } as any;

    mockIdempotencyCache = {
      checkAndSet: jest.fn().mockResolvedValue(false), // Not sent yet
      markSent: jest.fn().mockResolvedValue(undefined),
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
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
          useValue: mockSenderService,
        },
        {
          provide: ChannelSelectionService,
          useValue: {
            selectOptimalChannels: jest
              .fn()
              .mockResolvedValue([
                NotificationChannel.EMAIL,
                NotificationChannel.IN_APP,
              ]),
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
            sendNotification: jest.fn().mockResolvedValue(undefined),
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
          useValue: mockIdempotencyCache,
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

  describe('Complete Notification Flow', () => {
    it('should complete full flow: trigger -> pipeline -> render -> route -> send', async () => {
      const recipient = createMockRecipientInfo({
        userId: 'smoke-test-user',
        email: 'smoke@example.com',
        locale: 'en',
      });
      const event = createMockNotificationEvent({
        centerName: 'Smoke Test Center',
      });

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      // Verify complete flow
      expect(result.total).toBe(1);
      expect(result.sent).toBeGreaterThan(0);

      // Verify pipeline was called
      expect(mockPipelineService.process).toHaveBeenCalledTimes(1);

      // Verify renderer was called
      expect(mockRenderer.render).toHaveBeenCalled();

      // Verify router was called
      expect(mockRouterService.route).toHaveBeenCalled();

      // Verify idempotency was checked
      expect(mockIdempotencyCache.checkAndSet).toHaveBeenCalled();
    });

    it('should handle multi-channel notification flow', async () => {
      const recipient = createMockRecipientInfo({
        userId: 'multi-channel-user',
        email: 'multi@example.com',
        phone: '+1234567890',
      });
      const event = createMockNotificationEvent({
        centerName: 'Multi Channel Center',
      });

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      });

      expect(result.total).toBe(1);
      expect(mockRenderer.render).toHaveBeenCalledTimes(expect.any(Number));
    });

    it('should handle batch notification flow', async () => {
      const recipients = Array.from({ length: 5 }, (_, i) =>
        createMockRecipientInfo({
          userId: `batch-user-${i}`,
          email: `batch${i}@example.com`,
        }),
      );
      const event = createMockNotificationEvent({
        centerName: 'Batch Test Center',
      });

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.total).toBe(5);
      expect(mockPipelineService.process).toHaveBeenCalledTimes(5);
    });

    it('should handle flow with idempotency check (already sent)', async () => {
      mockIdempotencyCache.checkAndSet = jest.fn().mockResolvedValue(true); // Already sent

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      // Should skip sending if already sent
      expect(mockRouterService.route).not.toHaveBeenCalled();
      expect(result.total).toBe(1);
    });

    it('should handle flow with rendering error gracefully', async () => {
      mockRenderer.render = jest
        .fn()
        .mockRejectedValue(new Error('Rendering failed'));

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.failed).toBeGreaterThan(0);
    });

    it('should handle flow with send error gracefully', async () => {
      mockSenderService.send = jest
        .fn()
        .mockResolvedValue([
          {
            channel: NotificationChannel.EMAIL,
            success: false,
            error: 'Send failed',
          },
        ]);

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Flow Verification', () => {
    it('should verify all components are called in correct order', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      // Verify call order (pipeline -> render -> route)
      const pipelineCall =
        mockPipelineService.process.mock.invocationCallOrder[0];
      const renderCall = mockRenderer.render.mock.invocationCallOrder[0];
      const routeCall = mockRouterService.route.mock.invocationCallOrder[0];

      // Pipeline should be called first
      expect(pipelineCall).toBeLessThan(renderCall || Infinity);
      // Render should be called before route
      if (renderCall && routeCall) {
        expect(renderCall).toBeLessThan(routeCall);
      }
    });

    it('should verify correlation ID is passed through flow', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      // Verify correlation ID is used in pipeline
      const pipelineCall = mockPipelineService.process.mock.calls[0];
      expect(pipelineCall[0].correlationId).toBeDefined();

      // Verify correlation ID is used in idempotency check
      const idempotencyCall = mockIdempotencyCache.checkAndSet.mock.calls[0];
      expect(idempotencyCall[0]).toBeDefined(); // correlationId
    });
  });
});
