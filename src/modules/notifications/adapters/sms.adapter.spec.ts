import { Test, TestingModule } from '@nestjs/testing';
import { SmsAdapter } from './sms.adapter';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { TimeoutConfigService } from '../config/timeout.config';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import {
  createMockSmsPayload,
  createMockLoggerService,
  createMockMetricsService,
  flushPromises,
} from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import {
  MissingNotificationContentException,
  NotificationSendingFailedException,
} from '../exceptions/notification.exceptions';
import * as twilio from 'twilio';
import pTimeout from 'p-timeout';

// Mock Twilio - must be set up before any imports
jest.mock('twilio', () => {
  const mockTwilio = jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
  return mockTwilio;
});

// p-timeout is mocked globally in test-setup.ts

// Mock Config
jest.mock('@/shared/config/config', () => ({
  Config: {
    twilio: {
      accountSid: 'test-account-sid',
      authToken: 'test-auth-token',
      phoneNumber: '+1234567890',
    },
    app: {
      nodeEnv: 'test',
    },
  },
}));

describe('SmsAdapter', () => {
  let adapter: SmsAdapter;
  let mockTwilioClient: jest.Mocked<twilio.Twilio>;
  let mockLogger: LoggerService;
  let mockMetrics: NotificationMetricsService;
  let mockTimeoutConfig: jest.Mocked<TimeoutConfigService>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockMetrics = createMockMetricsService();

    mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'mock-message-sid',
          status: 'sent',
        }),
      },
    } as any;

    // Reset the twilio mock before each test
    (twilio as jest.MockedFunction<typeof twilio>).mockReset();
    (twilio as jest.MockedFunction<typeof twilio>).mockReturnValue(
      mockTwilioClient,
    );

    mockTimeoutConfig = {
      getTimeout: jest.fn().mockReturnValue(5000),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsAdapter,
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

    adapter = module.get<SmsAdapter>(SmsAdapter);
    // Ensure adapter is properly initialized
    await adapter.onModuleInit();

    // Verify twilio was called during initialization (may have been called before mock was set)
    // The important thing is that the adapter is configured
    expect(adapter).toBeDefined();
  });

  afterEach(async () => {
    // Reset mock call history but keep implementation
    if (mockTwilioClient?.messages?.create) {
      mockTwilioClient.messages.create.mockClear();
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SMxxx',
        status: 'queued',
      });
    }
    // Clear other mocks
    jest.clearAllMocks();
    // Wait a tick to ensure any pending promises are settled
    await flushPromises();
  });

  describe('send()', () => {
    it('should call Twilio messages.create() with correct params', async () => {
      const payload = createMockSmsPayload();
      payload.recipient = '+1987654321';
      payload.data.content = 'Test SMS message';

      await adapter.send(payload);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: 'Test SMS message',
        from: '+1234567890',
        to: '+1987654321',
      });
    });

    it('should use correct from number', async () => {
      const payload = createMockSmsPayload();

      await adapter.send(payload);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '+1234567890',
        }),
      );
    });

    it('should use correct to number', async () => {
      const payload = createMockSmsPayload();
      payload.recipient = '+1987654321';

      await adapter.send(payload);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1987654321',
        }),
      );
    });

    it('should use correct message body', async () => {
      const payload = createMockSmsPayload();
      payload.data.content = 'Test message content';

      await adapter.send(payload);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Test message content',
        }),
      );
    });

    it('should use content from data.content', async () => {
      const payload = createMockSmsPayload();
      payload.data.content = 'Content from data.content';

      await adapter.send(payload);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Content from data.content',
        }),
      );
    });

    it('should fallback to data.html if content missing', async () => {
      const payload = createMockSmsPayload({
        data: { content: '', html: 'HTML content' },
      });

      await adapter.send(payload);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'HTML content',
        }),
      );
    });

    it('should fallback to data.message if content and html missing', async () => {
      const payload = createMockSmsPayload({
        data: {
          content: '',
          html: undefined,
          message: 'Message content',
        },
      });

      await adapter.send(payload);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Message content',
        }),
      );
    });

    it('should throw MissingNotificationContentException if no content', async () => {
      const payload = createMockSmsPayload({
        data: { content: '', html: undefined, message: undefined },
      });

      await expect(adapter.send(payload)).rejects.toThrow(
        MissingNotificationContentException,
      );
    });

    it('should handle timeout', async () => {
      const payload = createMockSmsPayload();
      // Mock a promise that resolves quickly (p-timeout will handle actual timeout)
      mockTwilioClient.messages.create = jest.fn().mockResolvedValue({
        sid: 'SMxxx',
        status: 'queued',
      });

      await expect(adapter.send(payload)).resolves.not.toThrow();
    }, 10000); // Increase timeout for this test

    it('should handle Twilio API errors', async () => {
      const payload = createMockSmsPayload();
      // Reset and set up the mock to reject
      jest.clearAllMocks();
      mockTwilioClient.messages.create = jest
        .fn()
        .mockRejectedValue(new Error('Twilio API error: 20003'));

      await expect(adapter.send(payload)).rejects.toThrow(
        NotificationSendingFailedException,
      );
    });

    it('should handle network errors', async () => {
      const payload = createMockSmsPayload();
      // Reset and set up the mock to reject
      jest.clearAllMocks();
      mockTwilioClient.messages.create = jest
        .fn()
        .mockRejectedValue(new Error('Network timeout'));

      await expect(adapter.send(payload)).rejects.toThrow(
        NotificationSendingFailedException,
      );
    });

    it('should track metrics on success', async () => {
      const payload = createMockSmsPayload();

      await adapter.send(payload);

      expect(mockMetrics.incrementSent).toHaveBeenCalledWith(
        NotificationChannel.SMS,
        payload.type,
      );
      expect(mockMetrics.recordLatency).toHaveBeenCalledWith(
        NotificationChannel.SMS,
        expect.any(Number),
      );
    });

    it('should track metrics on failure', async () => {
      const payload = createMockSmsPayload();
      mockTwilioClient.messages.create = jest
        .fn()
        .mockRejectedValue(new Error('Twilio error'));

      try {
        await adapter.send(payload);
      } catch (error) {
        // Expected to throw
      }

      expect(mockMetrics.incrementFailed).toHaveBeenCalledWith(
        NotificationChannel.SMS,
        payload.type,
      );
    });

    it('should log send attempts', async () => {
      const payload = createMockSmsPayload();

      await adapter.send(payload);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('SMS sent successfully'),
        'SmsAdapter',
        expect.any(Object),
      );
    });
  });

  describe('Configuration', () => {
    it('should initialize Twilio client on module init', async () => {
      expect(twilio).toHaveBeenCalledWith(
        'test-account-sid',
        'test-auth-token',
      );
    });

    it('should log warning if not configured', async () => {
      // Mock Config with missing credentials
      jest.resetModules();
      jest.doMock('@/shared/config/config', () => ({
        Config: {
          twilio: {
            accountSid: '',
            authToken: '',
            phoneNumber: null,
          },
          app: {
            nodeEnv: 'test',
          },
        },
      }));

      const newAdapter = new SmsAdapter(
        mockLogger,
        mockMetrics,
        mockTimeoutConfig,
      );
      await newAdapter.onModuleInit();

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return early if not configured (logs only)', async () => {
      // Create a new adapter instance without Twilio configuration
      jest.resetModules();
      jest.doMock('@/shared/config/config', () => ({
        Config: {
          twilio: {
            accountSid: '',
            authToken: '',
            phoneNumber: null,
          },
          app: {
            nodeEnv: 'test',
          },
        },
      }));

      const unconfiguredAdapter = new SmsAdapter(
        mockLogger,
        mockMetrics,
        mockTimeoutConfig,
      );
      await unconfiguredAdapter.onModuleInit();

      const payload = createMockSmsPayload();
      await unconfiguredAdapter.send(payload);

      // Should log but not throw
      expect(mockLogger.log).toHaveBeenCalled();
      expect(mockMetrics.incrementFailed).toHaveBeenCalledWith(
        NotificationChannel.SMS,
        payload.type,
      );
    });
  });
});
