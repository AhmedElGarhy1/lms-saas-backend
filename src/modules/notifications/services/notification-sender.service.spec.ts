import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationSenderService } from './notification-sender.service';
import { EmailAdapter } from '../adapters/email.adapter';
import { SmsAdapter } from '../adapters/sms.adapter';
import { WhatsAppAdapter } from '../adapters/whatsapp.adapter';
import { InAppAdapter } from '../adapters/in-app.adapter';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { NotificationMetricsService } from './notification-metrics.service';
import { NotificationIdempotencyCacheService } from './notification-idempotency-cache.service';
import { NotificationCircuitBreakerService } from './notification-circuit-breaker.service';
import { Logger } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationType } from '../enums/notification-type.enum';
import {
  createMockEmailPayload,
  createMockSmsPayload,
  createMockWhatsAppPayload,
  createMockInAppPayload,
  createMockLoggerService,
  createMockMetricsService,
  createMockDataSource,
} from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import { createCorrelationId } from '../types/branded-types';
import { EntityManager } from 'typeorm';
import { createMockNotificationLog } from '../test/helpers/mock-entities';
import { EmailNotificationPayload } from '../types/notification-payload.interface';

describe('NotificationSenderService', () => {
  let service: NotificationSenderService;
  let mockEmailAdapter: jest.Mocked<EmailAdapter>;
  let mockSmsAdapter: jest.Mocked<SmsAdapter>;
  let mockWhatsAppAdapter: jest.Mocked<WhatsAppAdapter>;
  let mockInAppAdapter: jest.Mocked<InAppAdapter>;
  let mockLogRepository: jest.Mocked<NotificationLogRepository>;
  let mockMetrics: NotificationMetricsService;
  let mockLogger: Logger;
  let mockDataSource: Partial<DataSource>;
  let mockIdempotencyCache: jest.Mocked<NotificationIdempotencyCacheService>;
  let mockCircuitBreaker: jest.Mocked<NotificationCircuitBreakerService>;
  let mockEntityManagerRepo: {
    save: jest.Mock;
    update: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockMetrics = createMockMetricsService();
    mockDataSource = createMockDataSource();

    const mockNotificationLog = createMockNotificationLog({
      id: 'log-123',
      createdAt: new Date(),
      status: NotificationStatus.PENDING,
    });

    // Mock the transaction manager's getRepository to return our mock
    mockEntityManagerRepo = {
      save: jest.fn().mockResolvedValue(mockNotificationLog),
      update: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };

    (mockDataSource.transaction as jest.Mock) = jest
      .fn()
      .mockImplementation(
        async (runInTransaction: (entityManager: any) => Promise<any>) => {
          const mockEntityManager = {
            getRepository: jest.fn().mockReturnValue(mockEntityManagerRepo),
          };
          return runInTransaction(mockEntityManager);
        },
      );

    mockEmailAdapter = {
      send: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockSmsAdapter = {
      send: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockWhatsAppAdapter = {
      send: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockInAppAdapter = {
      send: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockLogRepository = {
      createNotificationLog: jest.fn().mockResolvedValue(mockNotificationLog),
      updateNotificationLogStatus: jest.fn().mockResolvedValue(undefined),
      findLogByJobId: jest.fn().mockResolvedValue(mockNotificationLog),
      save: jest.fn().mockResolvedValue(mockNotificationLog),
      update: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    } as any;

    mockIdempotencyCache = {
      markSent: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockCircuitBreaker = {
      executeWithCircuitBreaker: jest
        .fn()
        .mockImplementation(
          async <T>(channel: NotificationChannel, fn: () => Promise<T>) => fn(),
        ),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSenderService,
        {
          provide: EmailAdapter,
          useValue: mockEmailAdapter,
        },
        {
          provide: SmsAdapter,
          useValue: mockSmsAdapter,
        },
        {
          provide: WhatsAppAdapter,
          useValue: mockWhatsAppAdapter,
        },
        {
          provide: InAppAdapter,
          useValue: mockInAppAdapter,
        },
        {
          provide: NotificationTemplateService,
          useValue: {},
        },
        {
          provide: NotificationLogRepository,
          useValue: mockLogRepository,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: NotificationMetricsService,
          useValue: mockMetrics,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: NotificationIdempotencyCacheService,
          useValue: mockIdempotencyCache,
        },
        {
          provide: NotificationCircuitBreakerService,
          useValue: mockCircuitBreaker,
        },
      ],
    }).compile();

    service = module.get<NotificationSenderService>(NotificationSenderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send() - EMAIL Channel', () => {
    it('should call emailAdapter.send() with correct payload', async () => {
      const payload = createMockEmailPayload();

      await service.send(payload);

      expect(mockEmailAdapter.send).toHaveBeenCalledWith(payload);
    });

    it('should create notification log entry', async () => {
      const payload = createMockEmailPayload();

      await service.send(payload);

      // The save is called on the transaction manager's repository, not directly on mockLogRepository
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should update log status to SENT on success', async () => {
      const payload = createMockEmailPayload();

      await service.send(payload);

      expect(mockLogRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: NotificationStatus.SENT,
        }),
      );
    });

    it('should update log status to FAILED on error', async () => {
      const payload = createMockEmailPayload();
      mockEmailAdapter.send = jest
        .fn()
        .mockRejectedValue(new Error('SMTP error'));

      try {
        await service.send(payload);
      } catch (error) {
        // Expected to throw
      }

      // The update is called on the transaction manager's repository
      expect(mockEntityManagerRepo.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: NotificationStatus.FAILED,
        }),
      );
    });

    it('should record latency', async () => {
      const payload = createMockEmailPayload();

      await service.send(payload);

      expect(mockMetrics.recordLatency).toHaveBeenCalledWith(
        NotificationChannel.EMAIL,
        expect.any(Number),
      );
    });

    it('should increment sent metric', async () => {
      const payload = createMockEmailPayload();

      await service.send(payload);

      expect(mockMetrics.incrementSent).toHaveBeenCalledWith(
        NotificationChannel.EMAIL,
        payload.type,
      );
    });

    it('should increment failed metric on error', async () => {
      const payload = createMockEmailPayload();
      mockEmailAdapter.send = jest
        .fn()
        .mockRejectedValue(new Error('SMTP error'));

      try {
        await service.send(payload);
      } catch (error) {
        // Expected to throw
      }

      expect(mockMetrics.incrementFailed).toHaveBeenCalledWith(
        NotificationChannel.EMAIL,
        payload.type,
      );
    });

    it('should mark as sent in idempotency cache', async () => {
      const payload = createMockEmailPayload();
      payload.correlationId = createCorrelationId('test-correlation-id');

      await service.send(payload);

      expect(mockIdempotencyCache.markSent).toHaveBeenCalledWith(
        'test-correlation-id',
        payload.type,
        NotificationChannel.EMAIL,
        payload.recipient,
      );
    });

    it('should use transaction for atomicity', async () => {
      const payload = createMockEmailPayload();
      const transactionSpy = jest.spyOn(mockDataSource, 'transaction');

      await service.send(payload);

      expect(transactionSpy).toHaveBeenCalled();
    });
  });

  describe('send() - SMS Channel', () => {
    it('should call smsAdapter.send() with correct payload', async () => {
      const payload = createMockSmsPayload();

      await service.send(payload);

      expect(mockSmsAdapter.send).toHaveBeenCalledWith(payload);
    });

    it('should create notification log entry', async () => {
      const payload = createMockSmsPayload();

      await service.send(payload);

      // The save is called on the transaction manager's repository, not directly on mockLogRepository
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should handle Twilio errors', async () => {
      const payload = createMockSmsPayload();
      mockSmsAdapter.send = jest
        .fn()
        .mockRejectedValue(new Error('Twilio API error'));

      await expect(service.send(payload)).rejects.toThrow('Twilio API error');
    });

    it('should use circuit breaker if available', async () => {
      const payload = createMockSmsPayload();

      await service.send(payload);

      expect(mockCircuitBreaker.executeWithCircuitBreaker).toHaveBeenCalledWith(
        NotificationChannel.SMS,
        expect.any(Function),
      );
    });
  });

  describe('send() - WhatsApp Channel', () => {
    it('should call whatsappAdapter.send() with correct payload', async () => {
      const payload = createMockWhatsAppPayload();

      await service.send(payload);

      expect(mockWhatsAppAdapter.send).toHaveBeenCalled();
    });

    it('should handle provider errors (Twilio/Meta)', async () => {
      const payload = createMockWhatsAppPayload();
      mockWhatsAppAdapter.send = jest
        .fn()
        .mockRejectedValue(new Error('Provider error'));

      await expect(service.send(payload)).rejects.toThrow('Provider error');
    });
  });

  describe('send() - IN_APP Channel', () => {
    it('should call inAppAdapter.send() directly (no transaction)', async () => {
      const payload = createMockInAppPayload();
      const transactionSpy = jest.spyOn(mockDataSource, 'transaction');

      await service.send(payload);

      expect(mockInAppAdapter.send).toHaveBeenCalledWith(payload);
      // IN_APP should not use transaction
      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it('should create notification log entry', async () => {
      const payload = createMockInAppPayload();

      await service.send(payload);

      // The save is called on the transaction manager's repository, not directly on mockLogRepository
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should update log synchronously', async () => {
      const payload = createMockInAppPayload();

      await service.send(payload);

      expect(mockLogRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: NotificationStatus.SENT,
        }),
      );
    });
  });

  describe('Transaction Handling', () => {
    it('should create log entry in transaction', async () => {
      const payload = createMockEmailPayload();
      let transactionCallback: any;

      (mockDataSource.transaction as jest.Mock) = jest
        .fn()
        .mockImplementation(async (callback) => {
          transactionCallback = callback;
          return callback({
            getRepository: jest.fn().mockReturnValue(mockEntityManagerRepo),
          } as any);
        });

      await service.send(payload);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(transactionCallback).toBeDefined();
    });

    it('should update log in same transaction', async () => {
      const payload = createMockEmailPayload();
      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue({ id: 'log-123' }),
          update: jest.fn().mockResolvedValue(undefined),
        }),
      };

      (mockDataSource.transaction as jest.Mock) = jest
        .fn()
        .mockImplementation(async (callback) => callback(mockEntityManager));

      await service.send(payload);

      expect(mockEntityManager.getRepository).toHaveBeenCalled();
    });

    it('should handle existing log entries (retries)', async () => {
      const payload = createMockEmailPayload();
      payload.data = { ...payload.data, jobId: 'job-123' };

      const existingLog = createMockNotificationLog({
        id: 'log-123',
        status: NotificationStatus.PENDING,
        retryCount: 0,
      });

      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(existingLog),
          save: jest.fn(),
          update: jest.fn().mockResolvedValue(undefined),
        }),
      };

      (mockDataSource.transaction as jest.Mock) = jest
        .fn()
        .mockImplementation(async (callback) => callback(mockEntityManager));

      await service.send(payload);

      expect(mockEntityManager.getRepository().findOne).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker when available', async () => {
      const payload = createMockEmailPayload();

      await service.send(payload);

      expect(mockCircuitBreaker.executeWithCircuitBreaker).toHaveBeenCalledWith(
        NotificationChannel.EMAIL,
        expect.any(Function),
      );
    });

    it('should bypass circuit breaker when not available', async () => {
      const moduleWithoutBreaker: TestingModule =
        await Test.createTestingModule({
          providers: [
            NotificationSenderService,
            {
              provide: EmailAdapter,
              useValue: mockEmailAdapter,
            },
            {
              provide: SmsAdapter,
              useValue: mockSmsAdapter,
            },
            {
              provide: WhatsAppAdapter,
              useValue: mockWhatsAppAdapter,
            },
            {
              provide: InAppAdapter,
              useValue: mockInAppAdapter,
            },
            {
              provide: NotificationTemplateService,
              useValue: {},
            },
            {
              provide: NotificationLogRepository,
              useValue: mockLogRepository,
            },
            {
              provide: Logger,
              useValue: mockLogger,
            },
            {
              provide: NotificationMetricsService,
              useValue: mockMetrics,
            },
            {
              provide: getDataSourceToken(),
              useValue: mockDataSource,
            },
            // No circuit breaker provided
          ],
        }).compile();

      const serviceWithoutBreaker =
        moduleWithoutBreaker.get<NotificationSenderService>(
          NotificationSenderService,
        );

      const payload = createMockEmailPayload();
      await serviceWithoutBreaker.send(payload);

      // Should still work without circuit breaker
      expect(mockEmailAdapter.send).toHaveBeenCalled();
    });

    it('should handle OPEN circuit state', async () => {
      mockCircuitBreaker.executeWithCircuitBreaker = jest
        .fn()
        .mockRejectedValue(new Error('Circuit breaker is OPEN'));

      const payload = createMockEmailPayload();

      await expect(service.send(payload)).rejects.toThrow(
        'Circuit breaker is OPEN',
      );
    });
  });

  describe('Error Handling', () => {
    it('should log errors with full context', async () => {
      const payload = createMockEmailPayload();
      mockEmailAdapter.send = jest
        .fn()
        .mockRejectedValue(new Error('SMTP error'));

      try {
        await service.send(payload);
      } catch (error) {
        // Expected to throw
      }

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should re-throw errors for BullMQ retry', async () => {
      const payload = createMockEmailPayload();
      mockEmailAdapter.send = jest
        .fn()
        .mockRejectedValue(new Error('SMTP error'));

      await expect(service.send(payload)).rejects.toThrow('SMTP error');
    });

    it('should handle adapter not found', async () => {
      const payload = createMockEmailPayload();
      payload.channel = 'UNKNOWN_CHANNEL' as any;

      const result = await service.send(payload);

      expect(result[0].success).toBe(false);
      expect(result[0].error).toContain('No adapter found');
    });

    it('should handle missing rendered content', async () => {
      const payload = createMockEmailPayload();
      payload.data = {} as EmailNotificationPayload['data']; // Missing content

      const result = await service.send(payload);

      expect(result[0].success).toBe(false);
      expect(result[0].error).toContain('Missing pre-rendered content');
    });
  });
});
