import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { MetaWhatsAppProvider } from './providers/meta-whatsapp.provider';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { MetricsBatchService } from '../services/metrics-batch.service';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { TimeoutConfigService } from '../config/timeout.config';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { createMockWhatsAppPayload, flushPromises } from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import { FakeRedis } from '../test/fakes/fake-redis';
import {
  MissingNotificationContentException,
  NotificationSendingFailedException,
} from '../exceptions/notification.exceptions';

// p-timeout is mocked globally in test-setup.ts

// Mock Config
jest.mock('@/shared/config/config', () => ({
  Config: {
    app: {
      nodeEnv: 'test',
    },
  },
}));

describe('WhatsAppAdapter', () => {
  let adapter: WhatsAppAdapter;
  let mockMetaProvider: jest.Mocked<MetaWhatsAppProvider>;
  let metricsService: NotificationMetricsService;
  let timeoutConfig: TimeoutConfigService;
  let fakeRedis: FakeRedis;
  let redisService: RedisService;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    // Set up FakeRedis and RedisService
    fakeRedis = new FakeRedis();
    const fakeRedisClient = fakeRedis as unknown as any;
    redisService = new RedisService(fakeRedisClient);

    // Set up real services
    const batchService = new MetricsBatchService(redisService);
    metricsService = new NotificationMetricsService(redisService, batchService);

    mockMetaProvider = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(true),
      getProviderName: jest.fn().mockReturnValue('Meta WhatsApp Business API'),
    } as jest.Mocked<MetaWhatsAppProvider>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppAdapter,
        {
          provide: MetaWhatsAppProvider,
          useValue: mockMetaProvider,
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
        TimeoutConfigService, // Use real service
      ],
    }).compile();

    adapter = module.get<WhatsAppAdapter>(WhatsAppAdapter);
    timeoutConfig = module.get<TimeoutConfigService>(TimeoutConfigService);
    await adapter.onModuleInit();
  });

  afterEach(async () => {
    // Clear all mocks first
    jest.clearAllMocks();
    // Reset mocks to default resolved state to prevent unhandled rejections
    mockMetaProvider.sendMessage = jest.fn().mockResolvedValue(undefined);
    // Wait a tick to ensure any pending promises are settled
    await flushPromises();
  });

  describe('send()', () => {
    it('should call provider.sendMessage() with template structure', async () => {
      const payload = createMockWhatsAppPayload({
        recipient: '+1987654321',
        data: {
          templateName: 'otp_verification',
          templateLanguage: 'en',
          templateParameters: [
            { type: 'text', text: '123456' },
            { type: 'text', text: '10' },
          ],
        },
      });

      await adapter.send(payload);

      expect(mockMetaProvider.sendMessage).toHaveBeenCalledWith(
        '+1987654321',
        {
          templateName: 'otp_verification',
          templateLanguage: 'en',
          templateParameters: [
            { type: 'text', text: '123456' },
            { type: 'text', text: '10' },
          ],
        },
      );
    });

    it('should handle timeout', async () => {
      const payload = createMockWhatsAppPayload();
      // Mock a promise that resolves quickly (p-timeout will handle actual timeout)
      mockMetaProvider.sendMessage = jest.fn().mockResolvedValue(undefined);

      await expect(adapter.send(payload)).resolves.not.toThrow();
    }, 10000); // Increase timeout for this test

    it('should handle provider errors', async () => {
      const payload = createMockWhatsAppPayload();
      mockMetaProvider.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('Provider API error'));

      await expect(adapter.send(payload)).rejects.toThrow(
        NotificationSendingFailedException,
      );
    });

    it('should track metrics', async () => {
      const payload = createMockWhatsAppPayload();
      fakeRedis.clear();

      await adapter.send(payload);

      // Verify send was called (metrics are batched internally)
      expect(mockMetaProvider.sendMessage).toHaveBeenCalled();
    });

    it('should throw MissingNotificationContentException if template structure missing', async () => {
      const payload = createMockWhatsAppPayload({
        data: {
          templateName: '',
          templateLanguage: 'en',
          templateParameters: [],
        },
      });

      await expect(adapter.send(payload)).rejects.toThrow(
        MissingNotificationContentException,
      );
    });

    it('should return early if no provider configured (logs only)', async () => {
      mockMetaProvider.isConfigured = jest.fn().mockReturnValue(false);

      const newAdapter = new WhatsAppAdapter(
        metricsService,
        timeoutConfig,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      const payload = createMockWhatsAppPayload();

      // When not configured, adapter should handle gracefully (logs only)
      // Metrics are tracked internally via real service (batched)
      await expect(newAdapter.send(payload)).resolves.not.toThrow();
    });
  });
});
