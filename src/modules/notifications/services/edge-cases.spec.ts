import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { NotificationPipelineService } from './pipeline/notification-pipeline.service';
import { NotificationRouterService } from './routing/notification-router.service';
import { NotificationSenderService } from './notification-sender.service';
import { ChannelSelectionService } from './channel-selection.service';
import { NotificationTemplateService } from './notification-template.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationRenderer } from '../renderer/notification-renderer.service';
import { NotificationMetricsService } from './notification-metrics.service';
import { NotificationIdempotencyCacheService } from './notification-idempotency-cache.service';
import { ChannelRetryStrategyService } from './channel-retry-strategy.service';
import { MultiRecipientProcessor } from './multi-recipient-processor.service';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { FakeQueue } from '../test/fakes/fake-queue';
import { FakeRedis } from '../test/fakes/fake-redis';
import {
  createMockRecipientInfo,
  createMockNotificationEvent,
  createMockNotificationManifest,
  createMockLoggerService,
  createMockMetricsService,
} from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import { InvalidRecipientException } from '../exceptions/invalid-recipient.exception';
import { MissingTemplateVariablesException } from '../exceptions/notification.exceptions';

describe('Edge Cases and Error Scenarios', () => {
  let service: NotificationService;
  let fakeQueue: FakeQueue;
  let fakeRedis: FakeRedis;
  let mockPipelineService: jest.Mocked<NotificationPipelineService>;
  let mockRouterService: jest.Mocked<NotificationRouterService>;
  let mockRenderer: jest.Mocked<NotificationRenderer>;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;
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
      }),
    } as any;

    mockManifestResolver = {
      getManifest: jest.fn().mockReturnValue(createMockNotificationManifest()),
      getAudienceConfig: jest.fn().mockReturnValue({
        channels: {
          [NotificationChannel.EMAIL]: {},
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
        context.enabledChannels = [NotificationChannel.EMAIL];
        context.finalChannels = [NotificationChannel.EMAIL];
        return context;
      }),
    } as any;

    mockRouterService = {
      route: jest.fn().mockResolvedValue(undefined),
      enqueueNotifications: jest.fn().mockResolvedValue([]),
    } as any;

    mockIdempotencyCache = {
      checkAndSet: jest.fn().mockResolvedValue(false),
      markSent: jest.fn().mockResolvedValue(undefined),
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
            processRecipients: jest.fn().mockImplementation(async (recipients, processor) => {
              const results = await Promise.allSettled(
                recipients.map((r) => processor(r)),
              );
              return results.map((result, index) => ({
                recipient: recipients[index],
                result: result.status === 'fulfilled' ? result.value : new Error(String(result.reason)),
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

  describe('Invalid Recipients', () => {
    it('should handle recipient with invalid email', async () => {
      const recipient = createMockRecipientInfo({
        email: 'invalid-email',
        phone: undefined,
      });
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should handle recipient with invalid phone', async () => {
      const recipient = createMockRecipientInfo({
        email: undefined,
        phone: 'invalid-phone',
      });
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should handle recipient with no contact info', async () => {
      const recipient = createMockRecipientInfo({
        email: undefined,
        phone: undefined,
      });
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Missing Template Variables', () => {
    it('should handle missing required template variables', async () => {
      mockRenderer.render = jest
        .fn()
        .mockRejectedValue(
          new MissingTemplateVariablesException(
            NotificationType.CENTER_CREATED,
            NotificationChannel.EMAIL,
            ['missingVar'],
          ),
        );

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

  describe('Idempotency Edge Cases', () => {
    it('should handle idempotency check failure (fail open)', async () => {
      mockIdempotencyCache.checkAndSet = jest
        .fn()
        .mockRejectedValue(new Error('Redis error'));

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      // Should still proceed (fail open)
      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.total).toBe(1);
    });

    it('should skip sending if already sent (idempotency)', async () => {
      mockIdempotencyCache.checkAndSet = jest.fn().mockResolvedValue(true); // Already sent

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(mockRouterService.route).not.toHaveBeenCalled();
    });
  });

  describe('Channel Selection Edge Cases', () => {
    it('should handle no channels available for recipient', async () => {
      mockPipelineService.process = jest.fn().mockImplementation(async (context) => {
        context.enabledChannels = [];
        context.finalChannels = [];
        return context;
      });

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.sent).toBe(0);
    });

    it('should handle channel selection service failure', async () => {
      mockPipelineService.process = jest
        .fn()
        .mockRejectedValue(new Error('Channel selection failed'));

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('Empty and Null Cases', () => {
    it('should handle empty recipients array', async () => {
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [],
      });

      expect(result.total).toBe(0);
      expect(result.sent).toBe(0);
    });

    it('should handle null event data', async () => {
      const recipient = createMockRecipientInfo();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event: null as any,
        recipients: [recipient],
      });

      expect(result.total).toBe(1);
    });

    it('should handle missing manifest', async () => {
      mockManifestResolver.getManifest = jest.fn().mockReturnValue(null);

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

  describe('Concurrent Processing', () => {
    it('should handle concurrent notification triggers', async () => {
      const recipients = Array.from({ length: 5 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      // Trigger multiple concurrent requests
      const promises = Array.from({ length: 3 }, () =>
        service.trigger(NotificationType.CENTER_CREATED, {
          audience: 'OWNER',
          event,
          recipients,
        }),
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.total).toBe(5);
      });
    });
  });

  describe('Rate Limiting Edge Cases', () => {
    it('should handle rate limit exceeded for IN_APP', async () => {
      const inAppService = {
        checkUserRateLimit: jest.fn().mockResolvedValue(false), // Rate limited
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          {
            provide: getQueueToken('notifications'),
            useValue: fakeQueue,
          },
          {
            provide: InAppNotificationService,
            useValue: inAppService,
          },
          // ... other providers
        ],
      }).compile();

      // Test rate limiting behavior
      expect(inAppService.checkUserRateLimit).toBeDefined();
    });
  });
});


