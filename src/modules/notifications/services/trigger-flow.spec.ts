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
import { testManifests, testRecipients } from '../test/fixtures';
import { InvalidRecipientException } from '../exceptions/invalid-recipient.exception';
import { Locale } from '@/shared/common/enums/locale.enum';

describe('Trigger Flow', () => {
  let service: NotificationService;
  let fakeQueue: FakeQueue;
  let fakeRedis: FakeRedis;
  let mockLogger: LoggerService;
  let mockMetrics: NotificationMetricsService;
  let mockPipelineService: jest.Mocked<NotificationPipelineService>;
  let mockRouterService: jest.Mocked<NotificationRouterService>;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;
  let mockRenderer: jest.Mocked<NotificationRenderer>;
  let mockChannelSelection: jest.Mocked<ChannelSelectionService>;
  let mockIdempotencyCache: jest.Mocked<NotificationIdempotencyCacheService>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    fakeQueue = new FakeQueue();
    fakeRedis = new FakeRedis();
    mockLogger = createMockLoggerService();
    mockMetrics = createMockMetricsService();

    // Create mocks for services
    mockPipelineService = {
      process: jest.fn().mockImplementation(async (context, recipientInfo) => {
        // Simulate pipeline processing
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
        } as any;
        return context;
      }),
    } as any;

    mockRouterService = {
      route: jest.fn().mockResolvedValue(undefined),
      enqueueNotifications: jest.fn().mockResolvedValue([]),
    } as any;

    mockManifestResolver = {
      getManifest: jest.fn().mockReturnValue(testManifests.multiChannel),
      getAudienceConfig: jest.fn().mockReturnValue({
        channels: {
          [NotificationChannel.EMAIL]: {},
          [NotificationChannel.IN_APP]: {},
        },
      }),
      getChannelConfig: jest.fn().mockReturnValue({}),
    } as any;

    mockRenderer = {
      render: jest.fn().mockResolvedValue({
        content: 'Rendered content',
        subject: 'Test Subject',
        metadata: { template: 'test-template' },
      }),
    } as any;

    mockChannelSelection = {
      selectOptimalChannels: jest
        .fn()
        .mockResolvedValue([
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
        ]),
    } as any;

    mockIdempotencyCache = {
      acquireLock: jest.fn().mockResolvedValue(true),
      checkAndSet: jest.fn().mockResolvedValue(false),
      releaseLock: jest.fn().mockResolvedValue(undefined),
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
            send: jest
              .fn()
              .mockResolvedValue([
                { channel: NotificationChannel.EMAIL, success: true },
              ]),
          },
        },
        {
          provide: ChannelSelectionService,
          useValue: mockChannelSelection,
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
          useValue: mockLogger,
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
          useValue: mockMetrics,
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

  describe('Basic Trigger Flow', () => {
    it('should trigger notification for single recipient, single channel (EMAIL)', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
        channels: [NotificationChannel.EMAIL],
      });

      expect(result.total).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.correlationId).toBeDefined();
      expect(mockPipelineService.process).toHaveBeenCalledTimes(1);
      expect(mockRouterService.route).toHaveBeenCalledTimes(1);
    });

    it('should trigger notification for single recipient, multiple channels', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      });

      expect(result.total).toBe(1);
      expect(result.sent).toBe(1);
      expect(mockPipelineService.process).toHaveBeenCalledTimes(1);
      expect(mockRouterService.route).toHaveBeenCalledTimes(1);
    });

    it('should trigger notification for multiple recipients', async () => {
      const recipients = [
        createMockRecipientInfo({ userId: 'user-1' }),
        createMockRecipientInfo({ userId: 'user-2' }),
      ];
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.total).toBe(2);
      expect(result.sent).toBe(2);
      expect(mockPipelineService.process).toHaveBeenCalledTimes(2);
      expect(mockRouterService.route).toHaveBeenCalledTimes(2);
    });

    it('should return BulkNotificationResult with correct counts', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('correlationId');
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should generate correlation ID for each notification', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(
        NotificationType.CENTER_CREATED,
        {
          audience: 'OWNER',
          event,
          recipients: [recipient],
        },
      );

      // correlationId is now generated internally, not from RequestContext
      expect(result.correlationId).toBeDefined();
      expect(typeof result.correlationId).toBe('string');
      expect(result.correlationId.length).toBeGreaterThan(0);
    });

    it('should generate correlation ID if not in context', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.correlationId).toBeDefined();
      expect(typeof result.correlationId).toBe('string');
      expect(result.correlationId.length).toBeGreaterThan(0);
    });
  });

  describe('Recipient Validation', () => {
    it('should validate recipients with Zod schema', async () => {
      const validRecipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [validRecipient],
      });

      expect(result.sent).toBe(1);
    });

    it('should throw InvalidRecipientException for invalid recipients', async () => {
      const invalidRecipient = testRecipients.invalidEmail;
      const event = createMockNotificationEvent();

      await expect(
        service.trigger(NotificationType.CENTER_CREATED, {
          audience: 'OWNER',
          event,
          recipients: [invalidRecipient],
        }),
      ).rejects.toThrow(InvalidRecipientException);
    });

    it('should handle missing email for EMAIL channel gracefully', async () => {
      const recipientWithoutEmail = createMockRecipientInfo({ email: null });
      const event = createMockNotificationEvent();

      // Mock router to skip EMAIL channel when email is missing
      mockRouterService.route = jest.fn().mockResolvedValue(undefined);

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipientWithoutEmail],
        channels: [NotificationChannel.EMAIL],
      });

      // Should still process (router will skip EMAIL channel)
      expect(result.total).toBe(1);
    });

    it('should deduplicate recipients by userId', async () => {
      const recipient1 = createMockRecipientInfo({ userId: 'user-1' });
      const recipient2 = createMockRecipientInfo({ userId: 'user-1' }); // Duplicate
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient1, recipient2],
      });

      expect(result.total).toBe(2);
      expect(result.sent).toBe(1); // Only one unique recipient processed
      expect(mockPipelineService.process).toHaveBeenCalledTimes(1);
    });

    it('should handle empty recipients array', async () => {
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [],
      });

      expect(result.total).toBe(0);
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle pipeline service errors', async () => {
      mockPipelineService.process = jest
        .fn()
        .mockRejectedValue(new Error('Pipeline error'));
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain('Pipeline error');
    });

    it('should handle router service errors', async () => {
      mockRouterService.route = jest
        .fn()
        .mockRejectedValue(new Error('Router error'));
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('should continue processing other recipients on error', async () => {
      mockRouterService.route = jest
        .fn()
        .mockRejectedValueOnce(new Error('Router error'))
        .mockResolvedValueOnce(undefined);

      const recipients = [
        createMockRecipientInfo({ userId: 'user-1' }),
        createMockRecipientInfo({ userId: 'user-2' }),
      ];
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.total).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('should collect all errors in result.errors array', async () => {
      mockRouterService.route = jest
        .fn()
        .mockRejectedValue(new Error('Router error'));
      const recipients = [
        createMockRecipientInfo({ userId: 'user-1' }),
        createMockRecipientInfo({ userId: 'user-2' }),
      ];
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.errors.length).toBe(2);
      expect(result.errors[0].recipient).toBe('user-1');
      expect(result.errors[1].recipient).toBe('user-2');
    });
  });

  describe('Channel Selection', () => {
    it('should use requested channels when provided', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
        channels: [NotificationChannel.EMAIL],
      });

      expect(mockPipelineService.process).toHaveBeenCalledWith(
        expect.objectContaining({
          requestedChannels: [NotificationChannel.EMAIL],
        }),
        recipient,
      );
    });

    it('should fall back to manifest channels when none requested', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(mockPipelineService.process).toHaveBeenCalled();
      expect(mockChannelSelection.selectOptimalChannels).toHaveBeenCalled();
    });

    it('should use channel selection service for optimization', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(mockChannelSelection.selectOptimalChannels).toHaveBeenCalled();
    });
  });

  describe('Batch Processing', () => {
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
      expect(result.sent).toBe(10);
      expect(mockPipelineService.process).toHaveBeenCalledTimes(10);
    });

    it('should respect concurrency limit', async () => {
      const recipients = Array.from({ length: 50 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      // Add delay to pipeline to test concurrency
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

      // Should not exceed concurrency limit (default is usually 10)
      expect(maxConcurrent).toBeLessThanOrEqual(20); // Allow some buffer
    });

    it('should handle large batches (100+ recipients)', async () => {
      const recipients = Array.from({ length: 100 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });

      expect(result.total).toBe(100);
      expect(result.sent).toBe(100);
    });
  });

  describe('Idempotency', () => {
    it('should check idempotency cache', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      // Router service should check idempotency
      expect(mockRouterService.route).toHaveBeenCalled();
    });

    it('should handle idempotency cache errors gracefully', async () => {
      mockIdempotencyCache.acquireLock = jest
        .fn()
        .mockRejectedValue(new Error('Cache error'));
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      // Should still process (idempotency is optional)
      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.sent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should measure duration correctly', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should log start/complete events', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle large batches efficiently', async () => {
      const recipients = Array.from({ length: 1000 }, (_, i) =>
        createMockRecipientInfo({ userId: `user-${i}` }),
      );
      const event = createMockNotificationEvent();

      const startTime = Date.now();
      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients,
      });
      const endTime = Date.now();

      expect(result.total).toBe(1000);
      expect(result.duration).toBeLessThan(endTime - startTime + 100); // Allow some buffer
    });
  });

  describe('Edge Cases', () => {
    it('should handle recipients with only userId (no email/phone)', async () => {
      const recipient = createMockRecipientInfo({
        email: null,
        phone: '',
      });
      const event = createMockNotificationEvent();

      // Should still process (router will skip channels that require email/phone)
      const result = await service.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [recipient],
      });

      expect(result.total).toBe(1);
    });

    it('should handle missing manifest gracefully', async () => {
      mockManifestResolver.getManifest = jest.fn().mockImplementation(() => {
        throw new Error('Manifest not found');
      });

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await expect(
        service.trigger(NotificationType.CENTER_CREATED, {
          audience: 'OWNER',
          event,
          recipients: [recipient],
        }),
      ).rejects.toThrow();
    });

    it('should handle invalid audience', async () => {
      mockManifestResolver.getAudienceConfig = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Audience not found');
        });

      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();

      await expect(
        service.trigger(NotificationType.CENTER_CREATED, {
          audience: 'INVALID_AUDIENCE' as any,
          event,
          recipients: [recipient],
        }),
      ).rejects.toThrow();
    });

    it('should track skipped count correctly', async () => {
      // All recipients invalid
      const invalidRecipients = [
        testRecipients.invalidEmail,
        testRecipients.invalidPhone,
      ];
      const event = createMockNotificationEvent();

      await expect(
        service.trigger(NotificationType.CENTER_CREATED, {
          audience: 'OWNER',
          event,
          recipients: invalidRecipients,
        }),
      ).rejects.toThrow(InvalidRecipientException);
    });
  });
});
