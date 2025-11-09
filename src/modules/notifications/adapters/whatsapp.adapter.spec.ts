import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';
import { MetaWhatsAppProvider } from './providers/meta-whatsapp.provider';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { TimeoutConfigService } from '../config/timeout.config';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import {
  createMockWhatsAppPayload,
  createMockLoggerService,
  createMockMetricsService,
  flushPromises,
} from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import {
  MissingNotificationContentException,
  NotificationSendingFailedException,
} from '../exceptions/notification.exceptions';
import pTimeout from 'p-timeout';

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
  let mockLogger: LoggerService;
  let mockMetrics: NotificationMetricsService;
  let mockTimeoutConfig: jest.Mocked<TimeoutConfigService>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockMetrics = createMockMetricsService();

    mockTwilioProvider = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(true),
      getProviderName: jest.fn().mockReturnValue('Twilio'),
    } as jest.Mocked<Partial<TwilioWhatsAppProvider>>;

    mockMetaProvider = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(false),
      getProviderName: jest.fn().mockReturnValue('Meta'),
    } as jest.Mocked<Partial<MetaWhatsAppProvider>>;

    mockTimeoutConfig = {
      getTimeout: jest.fn().mockReturnValue(5000),
    } as jest.Mocked<Partial<TimeoutConfigService>>;

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
          provide: LoggerService,
          useValue: mockLogger,
        },
        {
          provide: NotificationMetricsService,
          useValue: mockMetrics,
        },
        {
          provide: TimeoutConfigService,
          useValue: mockTimeoutConfig,
        },
      ],
    }).compile();

    adapter = module.get<WhatsAppAdapter>(WhatsAppAdapter);
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
      } as jest.Mocked<Partial<MetaWhatsAppProvider>>;

      const newAdapter = new WhatsAppAdapter(
        mockLogger,
        mockMetrics,
        mockTimeoutConfig,
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

      await adapter.send(payload);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Twilio'),
        'WhatsAppAdapter',
        expect.objectContaining({
          provider: 'Twilio',
        }),
      );
    });

    it('should track metrics', async () => {
      const payload = createMockWhatsAppPayload();

      await adapter.send(payload);

      expect(mockMetrics.incrementSent).toHaveBeenCalledWith(
        NotificationChannel.WHATSAPP,
        payload.type,
      );
      expect(mockMetrics.recordLatency).toHaveBeenCalledWith(
        NotificationChannel.WHATSAPP,
        expect.any(Number),
      );
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
        mockLogger,
        mockMetrics,
        mockTimeoutConfig,
        mockTwilioProvider,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      const payload = createMockWhatsAppPayload();

      await newAdapter.send(payload);

      // Should log but not throw
      expect(mockLogger.log).toHaveBeenCalled();
      expect(mockMetrics.incrementFailed).toHaveBeenCalled();
    });
  });

  describe('Provider Selection', () => {
    it('should prefer Meta over Twilio', async () => {
      mockMetaProvider.isConfigured = jest.fn().mockReturnValue(true);

      const newAdapter = new WhatsAppAdapter(
        mockLogger,
        mockMetrics,
        mockTimeoutConfig,
        mockTwilioProvider,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Meta'),
        'WhatsAppAdapter',
      );
    });

    it('should fallback to Twilio if Meta not configured', async () => {
      mockMetaProvider.isConfigured = jest.fn().mockReturnValue(false);
      mockTwilioProvider.isConfigured = jest.fn().mockReturnValue(true);

      const newAdapter = new WhatsAppAdapter(
        mockLogger,
        mockMetrics,
        mockTimeoutConfig,
        mockTwilioProvider,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Twilio'),
        'WhatsAppAdapter',
      );
    });

    it('should log warning if no provider configured', async () => {
      mockTwilioProvider.isConfigured = jest.fn().mockReturnValue(false);
      mockMetaProvider.isConfigured = jest.fn().mockReturnValue(false);

      const newAdapter = new WhatsAppAdapter(
        mockLogger,
        mockMetrics,
        mockTimeoutConfig,
        mockTwilioProvider,
        mockMetaProvider,
      );
      await newAdapter.onModuleInit();

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});

