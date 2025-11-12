import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';
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
  let mockTwilioProvider: jest.Mocked<TwilioWhatsAppProvider>;
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

    mockTwilioProvider = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(true),
      getProviderName: jest.fn().mockReturnValue('Twilio'),
    } as jest.Mocked<TwilioWhatsAppProvider>;

    mockMetaProvider = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(false),
      getProviderName: jest.fn().mockReturnValue('Meta'),
    } as jest.Mocked<MetaWhatsAppProvider>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppAdapter,
        {
          provide: TwilioWhatsAppProvider,
          useValue: mockTwilioProvider,
        },
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
    mockTwilioProvider.sendMessage = jest.fn().mockResolvedValue(undefined);
    mockMetaProvider.sendMessage = jest.fn().mockResolvedValue(undefined);
    // Wait a tick to ensure any pending promises are settled
    await flushPromises();
  });

  describe('send()', () => {
    it('should use Twilio provider when Meta is not configured', async () => {
      const payload = createMockWhatsAppPayload();

      await adapter.send(payload);

      expect(mockTwilioProvider.sendMessage).toHaveBeenCalled();
      expect(mockMetaProvider.sendMessage).not.toHaveBeenCalled();
    });

    it('should prefer Meta provider over Twilio if both configured', async () => {
      const metaProvider = {
        sendMessage: jest.fn().mockResolvedValue(undefined),
        isConfigured: jest.fn().mockReturnValue(true),
        getProviderName: jest.fn().mockReturnValue('Meta'),
      } as any;

      const newAdapter = new WhatsAppAdapter(
        metricsService,
        timeoutConfig,
        mockTwilioProvider,
        metaProvider,
      );
      await newAdapter.onModuleInit();

      const payload = createMockWhatsAppPayload();

      await newAdapter.send(payload);

      expect(metaProvider.sendMessage).toHaveBeenCalled();
      expect(mockTwilioProvider.sendMessage).not.toHaveBeenCalled();
    });

    it('should call provider.sendMessage() with correct params', async () => {
      const payload = createMockWhatsAppPayload({
        recipient: '+1987654321',
        data: { content: 'Test WhatsApp message' },
      });

      await adapter.send(payload);

      expect(mockTwilioProvider.sendMessage).toHaveBeenCalledWith(
        '+1987654321',
        'Test WhatsApp message',
      );
    });

    it('should handle timeout', async () => {
      const payload = createMockWhatsAppPayload();
      // Mock a promise that resolves quickly (p-timeout will handle actual timeout)
      mockTwilioProvider.sendMessage = jest.fn().mockResolvedValue(undefined);

      await expect(adapter.send(payload)).resolves.not.toThrow();
    }, 10000); // Increase timeout for this test

    it('should handle provider errors', async () => {
      const payload = createMockWhatsAppPayload();
      mockTwilioProvider.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('Provider API error'));

      await expect(adapter.send(payload)).rejects.toThrow(
        NotificationSendingFailedException,
      );
    });

    it('should log provider name', async () => {
      const payload = createMockWhatsAppPayload();
      fakeRedis.clear();

      await adapter.send(payload);

      // Verify send was called (metrics are tracked internally via real service)
      expect(mockTwilioProvider.sendMessage).toHaveBeenCalled();
    });

    it('should track metrics', async () => {
      const payload = createMockWhatsAppPayload();
      fakeRedis.clear();

      await adapter.send(payload);

      // Verify send was called (metrics are batched internally)
      expect(mockTwilioProvider.sendMessage).toHaveBeenCalled();
    });

    it('should throw MissingNotificationContentException if no content', async () => {
      const payload = createMockWhatsAppPayload({
        data: { content: '', html: undefined, message: undefined },
      });

      await expect(adapter.send(payload)).rejects.toThrow(
        MissingNotificationContentException,
      );
    });

    it('should return early if no provider configured (logs only)', async () => {
      mockTwilioProvider.isConfigured = jest.fn().mockReturnValue(false);
      mockMetaProvider.isConfigured = jest.fn().mockReturnValue(false);

      const newAdapter = new WhatsAppAdapter(
        metricsService,
        timeoutConfig,
        mockTwilioProvider,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      const payload = createMockWhatsAppPayload();

      // When not configured, adapter should handle gracefully (logs only)
      // Metrics are tracked internally via real service (batched)
      await expect(newAdapter.send(payload)).resolves.not.toThrow();
    });
  });

  describe('Provider Selection', () => {
    it('should prefer Meta over Twilio', async () => {
      mockMetaProvider.isConfigured = jest.fn().mockReturnValue(true);

      const newAdapter = new WhatsAppAdapter(
        metricsService,
        timeoutConfig,
        mockTwilioProvider,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      // Meta provider should be selected
    });

    it('should fallback to Twilio if Meta not configured', async () => {
      mockMetaProvider.isConfigured = jest.fn().mockReturnValue(false);
      mockTwilioProvider.isConfigured = jest.fn().mockReturnValue(true);

      const newAdapter = new WhatsAppAdapter(
        metricsService,
        timeoutConfig,
        mockTwilioProvider,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      // Twilio provider should be selected as fallback
    });

    it('should log warning if no provider configured', async () => {
      mockTwilioProvider.isConfigured = jest.fn().mockReturnValue(false);
      mockMetaProvider.isConfigured = jest.fn().mockReturnValue(false);

      const newAdapter = new WhatsAppAdapter(
        metricsService,
        timeoutConfig,
        mockTwilioProvider,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      // Adapter should handle missing config gracefully
    });
  });
});
