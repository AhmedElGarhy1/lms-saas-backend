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
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { FakeQueue } from './fakes/fake-queue';
import { FakeRedis } from './fakes/fake-redis';
import {
  createMockNotificationManifest,
  createMockLoggerService,
  createMockMetricsService,
} from './helpers';
import { TestEnvGuard } from './helpers/test-env-guard';
import {
  generateFakeRecipients,
  simulateLoad,
  calculateMetrics,
} from './load-simulation';
import { RenderedNotification } from '../manifests/types/manifest.types';

describe('Load Simulation', () => {
  let service: NotificationService;
  let fakeQueue: FakeQueue;
  let fakeRedis: FakeRedis;
  let mockPipelineService: jest.Mocked<NotificationPipelineService>;
  let mockRouterService: jest.Mocked<NotificationRouterService>;
  let mockRenderer: jest.Mocked<NotificationRenderer>;

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
            send: jest.fn().mockResolvedValue([
              { channel: NotificationChannel.EMAIL, success: true },
            ]),
          },
        },
        {
          provide: ChannelSelectionService,
          useValue: {
            selectOptimalChannels: jest.fn().mockResolvedValue([
              NotificationChannel.EMAIL,
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
          },
        },
        {
          provide: LoggerService,
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
          useValue: {
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
          },
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
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    fakeQueue.clear();
    fakeRedis.clear();
    jest.clearAllMocks();
  });

  describe('Small Batch (10-50 recipients)', () => {
    it('should process 10 recipients efficiently', async () => {
      const recipients = generateFakeRecipients(10);
      const event = { centerName: 'Test Center' };

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.total).toBe(10);
      expect(result.sent).toBeGreaterThan(0);
      expect(mockPipelineService.process).toHaveBeenCalledTimes(10);
    });

    it('should process 50 recipients efficiently', async () => {
      const recipients = generateFakeRecipients(50);
      const event = { centerName: 'Test Center' };

      const { duration, result } = await simulateLoad(
        async (recips) =>
          service.trigger(NotificationType.CENTER_CREATED, {
            audience: 'OWNER',
            event,
            recipients: recips,
          }),
        { recipientCount: 50 },
      );

      expect(result.total).toBe(50);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
      const metrics = calculateMetrics(result, duration);
      expect(metrics.recipientsPerSecond).toBeGreaterThan(5);
    });

    it('should verify no duplicate sends', async () => {
      const recipients = generateFakeRecipients(20);
      const event = { centerName: 'Test Center' };

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      // Check that each recipient was processed once
      const processedUserIds = new Set(
        mockPipelineService.process.mock.calls.map(
          (call) => call[1].userId,
        ),
      );
      expect(processedUserIds.size).toBe(20);
    });
  });

  describe('Medium Batch (100-500 recipients)', () => {
    it('should process 100 recipients efficiently', async () => {
      const recipients = generateFakeRecipients(100);
      const event = { centerName: 'Test Center' };

      const { duration, result } = await simulateLoad(
        async (recips) =>
          service.trigger(NotificationType.CENTER_CREATED, {
            audience: 'OWNER',
            event,
            recipients: recips,
          }),
        { recipientCount: 100 },
      );

      expect(result.total).toBe(100);
      expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds
      const metrics = calculateMetrics(result, duration);
      expect(metrics.recipientsPerSecond).toBeGreaterThan(10);
    });

    it('should process 500 recipients efficiently', async () => {
      const recipients = generateFakeRecipients(500);
      const event = { centerName: 'Test Center' };

      const { duration, result } = await simulateLoad(
        async (recips) =>
          service.trigger(NotificationType.CENTER_CREATED, {
            audience: 'OWNER',
            event,
            recipients: recips,
          }),
        { recipientCount: 500 },
      );

      expect(result.total).toBe(500);
      const metrics = calculateMetrics(result, duration);
      expect(metrics.recipientsPerSecond).toBeGreaterThan(20);
    });

    it('should verify template rendering optimization', async () => {
      const recipients = generateFakeRecipients(100);
      const event = { centerName: 'Test Center' };

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      // Verify render was called (may be cached/optimized)
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should verify bulk enqueueing', async () => {
      const recipients = generateFakeRecipients(200);
      const event = { centerName: 'Test Center' };

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      // Should use bulk enqueue
      expect(mockRouterService.enqueueNotifications).toHaveBeenCalled();
      const enqueueCalls = mockRouterService.enqueueNotifications.mock.calls;
      expect(enqueueCalls.length).toBeGreaterThan(0);
    });

    it('should respect concurrency limit', async () => {
      const recipients = generateFakeRecipients(300);
      const event = { centerName: 'Test Center' };

      let concurrentCount = 0;
      let maxConcurrent = 0;
      mockPipelineService.process = jest.fn().mockImplementation(async (context, recipientInfo) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise((resolve) => setTimeout(resolve, 5));
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
  });

  describe('Large Batch (1000+ recipients)', () => {
    it('should process 1000 recipients efficiently', async () => {
      const recipients = generateFakeRecipients(1000);
      const event = { centerName: 'Test Center' };

      const { duration, result } = await simulateLoad(
        async (recips) =>
          service.trigger(NotificationType.CENTER_CREATED, {
            audience: 'OWNER',
            event,
            recipients: recips,
          }),
        { recipientCount: 1000 },
      );

      expect(result.total).toBe(1000);
      const metrics = calculateMetrics(result, duration);
      expect(metrics.recipientsPerSecond).toBeGreaterThan(30);
    });

    it('should handle errors in large batch gracefully', async () => {
      const recipients = generateFakeRecipients(1000, {
        includeErrors: true,
        errorRate: 0.1, // 10% error rate
      });
      const event = { centerName: 'Test Center' };

      const { duration, result } = await simulateLoad(
        async (recips) =>
          service.trigger(NotificationType.CENTER_CREATED, {
            audience: 'OWNER',
            event,
            recipients: recips,
          }),
        { recipientCount: 1000, includeErrors: true, errorRate: 0.1 },
      );

      expect(result.total).toBe(1000);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.sent + result.failed).toBeLessThanOrEqual(1000);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate performance metrics correctly', () => {
      const result = { total: 100, sent: 95, failed: 5 };
      const duration = 2000; // 2 seconds

      const metrics = calculateMetrics(result, duration);

      expect(metrics.totalRecipients).toBe(100);
      expect(metrics.duration).toBe(2000);
      expect(metrics.recipientsPerSecond).toBe(50);
      expect(metrics.averageLatency).toBe(20);
      expect(metrics.successRate).toBe(0.95);
    });
  });
});


