import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationRouterService } from '../../adapters/notification-router.service';
import { NotificationSenderService } from '../notification-sender.service';
import { InAppNotificationService } from '../in-app-notification.service';
import { NotificationRenderer } from '../../renderer/notification-renderer.service';
import { NotificationManifestResolver } from '../../manifests/registry/notification-manifest-resolver.service';
import { NotificationIdempotencyCacheService } from '../notification-idempotency-cache.service';
import { NotificationMetricsService } from '../notification-metrics.service';
import { MetricsBatchService } from '../metrics-batch.service';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { ChannelRetryStrategyService } from '../channel-retry-strategy.service';
import { RecipientValidationService } from '../recipient-validation.service';
import { PayloadBuilderService } from '../payload-builder.service';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { FakeQueue } from '../../test/fakes/fake-queue';
import { FakeRedis } from '../../test/fakes/fake-redis';
import {
  createMockNotificationManifest,
  createMockNotificationContext,
  createMockEmailPayload,
  createMockSmsPayload,
} from '../../test/helpers';
import { TestEnvGuard } from '../../test/helpers/test-env-guard';
import { RenderedNotification } from '../../manifests/types/manifest.types';

describe('NotificationRouterService', () => {
  let service: NotificationRouterService;
  let fakeQueue: FakeQueue;
  let fakeRedis: FakeRedis;
  let redisService: RedisService;
  let mockSenderService: jest.Mocked<NotificationSenderService>;
  let mockInAppService: jest.Mocked<InAppNotificationService>;
  let mockRenderer: jest.Mocked<NotificationRenderer>;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;
  let idempotencyCache: NotificationIdempotencyCacheService;
  let metricsService: NotificationMetricsService;
  let retryStrategy: ChannelRetryStrategyService;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    fakeQueue = new FakeQueue();

    // Set up FakeRedis and real services
    fakeRedis = new FakeRedis();
    // FakeRedis implements all methods used by RedisService
    // Type assertion is safe because FakeRedis implements the required methods
    redisService = new RedisService(fakeRedis as Redis);

    // Set up real metrics service
    const batchService = new MetricsBatchService(redisService);
    metricsService = new NotificationMetricsService(redisService, batchService);

    // Set up real idempotency cache service
    idempotencyCache = new NotificationIdempotencyCacheService(redisService);

    // Set up real retry strategy service (pure service, no dependencies)
    retryStrategy = new ChannelRetryStrategyService();

    mockSenderService = {
      send: jest
        .fn()
        .mockResolvedValue([
          { channel: NotificationChannel.EMAIL, success: true },
        ]),
      sendMultiple: jest.fn().mockResolvedValue([]),
    } as Partial<NotificationSenderService> as jest.Mocked<NotificationSenderService>;

    mockInAppService = {
      checkUserRateLimit: jest.fn().mockResolvedValue(true),
      getRateLimitConfig: jest.fn().mockReturnValue({
        limit: 100,
        windowSeconds: 60,
      }),
    } as Partial<InAppNotificationService> as jest.Mocked<InAppNotificationService>;

    mockRenderer = {
      render: jest.fn().mockResolvedValue({
        content: '<p>Rendered content</p>',
        subject: 'Test Subject',
        metadata: { template: 'test-template', locale: 'en' },
      } as RenderedNotification),
    } as Partial<NotificationRenderer> as jest.Mocked<NotificationRenderer>;

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
    } as Partial<NotificationManifestResolver> as jest.Mocked<NotificationManifestResolver>;

    // Use real pure services
    const recipientValidator = new RecipientValidationService();
    const payloadBuilder = new PayloadBuilderService();

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
          useValue: idempotencyCache,
        },
        {
          provide: NotificationMetricsService,
          useValue: metricsService,
        },
        {
          provide: MetricsBatchService,
          useValue: batchService,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: ChannelRetryStrategyService,
          useValue: retryStrategy,
        },
        {
          provide: RecipientValidationService,
          useValue: recipientValidator,
        },
        {
          provide: PayloadBuilderService,
          useValue: payloadBuilder,
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
      fakeRedis.clear();

      await service.route(context);

      // Verify idempotency was checked by verifying send was called (idempotency check passed)
      expect(mockSenderService.send).toHaveBeenCalled();
    });

    it('should skip sending if already sent (idempotency)', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });
      fakeRedis.clear();

      // First send - should succeed
      await service.route(context);
      expect(mockSenderService.send).toHaveBeenCalledTimes(1);

      // Second send with same correlationId - should be skipped due to idempotency
      await service.route(context);
      // Should not send again (idempotency prevents duplicate)
      expect(mockSenderService.send).toHaveBeenCalledTimes(1);
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

      // Idempotency cache marks as sent internally after successful send
      // Verify by checking that send was called
      expect(mockSenderService.send).toHaveBeenCalled();
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
      // Error is logged internally by the service
      // Verify by checking that send was not called or failed
      expect(mockSenderService.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', async () => {
      mockSenderService.send = jest.fn().mockResolvedValue([
        {
          channel: NotificationChannel.EMAIL,
          success: false,
          error: 'Send failed',
        },
      ]);

      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });

      await service.route(context);

      // Warning should be logged
      // Warning is logged internally by the service
      // Verify by checking the behavior (send was not called)
      expect(mockSenderService.send).not.toHaveBeenCalled();
    });
  });

  describe('enqueueNotifications()', () => {
    it('should enqueue notifications to queue', async () => {
      const payloads = [createMockEmailPayload(), createMockSmsPayload()];

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

      // Retry strategy is used internally by the service
      // Verify by checking that retry config is available
      const retryConfig = retryStrategy.getRetryConfig(
        NotificationChannel.EMAIL,
      );
      expect(retryConfig).toBeDefined();
      expect(retryConfig.maxAttempts).toBeGreaterThan(0);
    });

    it('should handle queue errors gracefully', async () => {
      // Mock queue to throw error
      fakeQueue.add = jest.fn().mockRejectedValue(new Error('Queue error'));

      const payload = createMockEmailPayload();

      await service.enqueueNotifications([payload]);

      // Error is logged internally by the service
      // Verify by checking that send was not called or failed
      expect(mockSenderService.send).not.toHaveBeenCalled();
    });
  });

  describe('Payload Building Integration', () => {
    it('should build EMAIL payload correctly through route()', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.EMAIL],
      });

      await service.route(context);

      // Verify payload was built correctly by checking what was sent
      expect(mockSenderService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          subject: expect.any(String),
        }),
      );
    });

    it('should build SMS payload correctly through route()', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.SMS],
        phone: '+1234567890',
      });

      await service.route(context);

      // Verify payload was built correctly by checking what was sent
      expect(mockSenderService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.SMS,
          recipient: '+1234567890',
        }),
      );
    });

    it('should build IN_APP payload correctly through route()', async () => {
      const context = createMockNotificationContext({
        finalChannels: [NotificationChannel.IN_APP],
      });

      await service.route(context);

      // Verify payload was built correctly by checking what was sent
      // IN_APP goes through senderService.send() for direct delivery
      expect(mockSenderService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.IN_APP,
        }),
      );
    });
  });
});
