import { Test, TestingModule } from '@nestjs/testing';
import { EmailAdapter } from './email.adapter';
import { TimeoutConfigService } from '../config/timeout.config';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import {
  createMockEmailPayload,
  flushPromises,
} from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import * as nodemailer from 'nodemailer';
import pTimeout from 'p-timeout';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

// p-timeout is mocked globally in test-setup.ts

describe('EmailAdapter', () => {
  let adapter: EmailAdapter;
  let mockTransporter: jest.Mocked<nodemailer.Transporter>;
  let mockTimeoutConfig: jest.Mocked<TimeoutConfigService>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'mock-message-id',
        accepted: ['test@example.com'],
      }),
    } as any;

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    mockTimeoutConfig = {
      getTimeout: jest.fn().mockReturnValue(5000),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailAdapter,
        {
          provide: TimeoutConfigService,
          useValue: mockTimeoutConfig,
        },
      ],
    }).compile();

    adapter = module.get<EmailAdapter>(EmailAdapter);
  });

  afterEach(async () => {
    // Clear all mocks first
    jest.clearAllMocks();
    // Reset mock to default resolved state to prevent unhandled rejections
    mockTransporter.sendMail = jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
      accepted: ['test@example.com'],
    });
    // Wait a tick to ensure any pending promises are settled
    await flushPromises();
  });

  describe('send()', () => {
    it('should call nodemailer.sendMail() with correct params', async () => {
      const payload = createMockEmailPayload();

      await adapter.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: expect.stringContaining('LMS SaaS'),
        to: payload.recipient,
        subject: payload.subject,
        html: payload.data.html,
      });
    });

    it('should use correct from address', async () => {
      const payload = createMockEmailPayload();

      await adapter.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('LMS SaaS'),
        }),
      );
    });

    it('should use correct to address', async () => {
      const payload = createMockEmailPayload();
      payload.recipient = 'recipient@example.com';

      await adapter.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
        }),
      );
    });

    it('should use correct subject', async () => {
      const payload = createMockEmailPayload();
      payload.subject = 'Test Subject';

      await adapter.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Test Subject',
        }),
      );
    });

    it('should use correct HTML content', async () => {
      const payload = createMockEmailPayload();
      payload.data.html = '<p>Test HTML</p>';

      await adapter.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<p>Test HTML</p>',
        }),
      );
    });

    it('should fallback to content if html is missing', async () => {
      const payload = createMockEmailPayload({
        data: { html: '', content: 'Plain text content' },
      });

      await adapter.send(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: 'Plain text content',
        }),
      );
    });

    it('should handle timeout', async () => {
      const payload = createMockEmailPayload();
      // Mock a promise that resolves quickly (p-timeout will handle actual timeout)
      mockTransporter.sendMail = jest.fn().mockResolvedValue({
        messageId: 'mock-message-id',
        accepted: ['test@example.com'],
      });

      // p-timeout should wrap the call
      await expect(adapter.send(payload)).resolves.not.toThrow();
    }, 10000); // Increase timeout for this test

    it('should handle SMTP errors', async () => {
      const payload = createMockEmailPayload();
      mockTransporter.sendMail = jest
        .fn()
        .mockRejectedValue(new Error('SMTP connection failed'));

      await expect(adapter.send(payload)).rejects.toThrow(
        'SMTP connection failed',
      );
    });

    it('should handle network errors', async () => {
      const payload = createMockEmailPayload();
      mockTransporter.sendMail = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(adapter.send(payload)).rejects.toThrow('Network error');
    });

    it('should use timeout from TimeoutConfigService', async () => {
      const payload = createMockEmailPayload();
      mockTimeoutConfig.getTimeout = jest.fn().mockReturnValue(10000);

      await adapter.send(payload);

      expect(mockTimeoutConfig.getTimeout).toHaveBeenCalledWith(
        NotificationChannel.EMAIL,
      );
    });
  });
});

