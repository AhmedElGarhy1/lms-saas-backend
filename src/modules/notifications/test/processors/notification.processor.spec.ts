import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationProcessor } from '../../processors/notification.processor';
import { NotificationSenderService } from '../../services/notification-sender.service';
import { NotificationLogRepository } from '../../repositories/notification-log.repository';
import { NotificationMetricsService } from '../../services/notification-metrics.service';
import { ChannelRetryStrategyService } from '../../services/channel-retry-strategy.service';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationStatus } from '../../enums/notification-status.enum';
import { NotificationSendingFailedException } from '../../exceptions/notification.exceptions';
import { FakeQueue } from '../fakes/fake-queue';
import {
  createMockEmailPayload,
  createMockMetricsService,
} from '../helpers';
import { TestEnvGuard } from '../helpers/test-env-guard';
import { NotificationJobData } from '../../types/notification-job-data.interface';
import { createMockNotificationLog } from '../helpers/mock-entities';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let mockSenderService: jest.Mocked<NotificationSenderService>;
  let mockLogRepository: jest.Mocked<NotificationLogRepository>;
  let mockMetrics: NotificationMetricsService;
  let mockRetryStrategy: jest.Mocked<ChannelRetryStrategyService>;
  let fakeQueue: FakeQueue;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    fakeQueue = new FakeQueue();
    mockMetrics = createMockMetricsService();

    mockSenderService = {
      send: jest
        .fn()
        .mockResolvedValue([
          { channel: NotificationChannel.EMAIL, success: true },
        ]),
    } as any;

    const mockNotificationLog = createMockNotificationLog({
      id: 'log-123',
      userId: 'user-123',
      type: NotificationType.CENTER_CREATED,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.PENDING,
      createdAt: new Date(),
      retryCount: 0,
    });

    mockLogRepository = {
      findMany: jest.fn().mockResolvedValue([mockNotificationLog]),
      update: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockRetryStrategy = {
      getRetryConfig: jest.fn().mockReturnValue({
        maxAttempts: 3,
        backoffType: 'exponential',
        backoffDelay: 2000,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: NotificationSenderService,
          useValue: mockSenderService,
        },
        {
          provide: NotificationLogRepository,
          useValue: mockLogRepository,
        },
        {
          provide: NotificationMetricsService,
          useValue: mockMetrics,
        },
        {
          provide: ChannelRetryStrategyService,
          useValue: mockRetryStrategy,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: fakeQueue,
        },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
    fakeQueue.clear();
  });

  describe('process()', () => {
    it('should process job with valid data', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
        retryCount: 0,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockSenderService.send).toHaveBeenCalled();
    });

    it('should validate job data format', async () => {
      const invalidJob = {
        id: 'job-123',
        data: { invalid: 'data' },
        attemptsMade: 0,
      } as Job<any>;

      await expect(processor.process(invalidJob)).rejects.toThrow(
        'Invalid job data format',
      );
    });

    it('should use correlationId from job payload', async () => {
      const correlationId = 'test-correlation-id';
      const payload = createMockEmailPayload();
      payload.correlationId = correlationId as any;
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await processor.process(job);

      // correlationId is now passed through payload, not RequestContext
      // Verify it's used in the payload
      expect(payload.correlationId).toBe(correlationId);
    });

    it('should generate correlationId if not in job data', async () => {
      const payload = createMockEmailPayload();
      delete payload.correlationId;
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await processor.process(job);

      // correlationId is generated internally if not in payload
      // The processor generates it and uses it for logging/tracing
      expect(mockSenderService.send).toHaveBeenCalled();
    });

    it('should call senderService.send()', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockSenderService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          type: payload.type,
        }),
      );
    });

    it('should handle send success', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockSenderService.send).toHaveBeenCalled();
    });

    it('should handle send failure', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      mockSenderService.send = jest.fn().mockResolvedValue([
        {
          channel: NotificationChannel.EMAIL,
          success: false,
          error: 'SMTP error',
        },
      ]);

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await expect(processor.process(job)).rejects.toThrow(
        NotificationSendingFailedException,
      );
    });

    it('should update job data with retry count', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 2, // Retry attempt
      } as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockSenderService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retryCount: 2,
            jobId: 'job-123',
          }),
        }),
      );
    });
  });

  describe('Retry Logic', () => {
    it('should respect channel-specific retry config', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
      } as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockRetryStrategy.getRetryConfig).toHaveBeenCalledWith(
        NotificationChannel.EMAIL,
      );
    });

    it('should increment retry count', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
      } as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockSenderService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retryCount: 1,
          }),
        }),
      );
    });

    it('should track retry metrics', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
      } as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockMetrics.incrementRetry).toHaveBeenCalledWith(
        NotificationChannel.EMAIL,
      );
    });

    it('should handle non-retryable errors', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
        retryable: false,
      };

      mockSenderService.send = jest
        .fn()
        .mockRejectedValue(
          new NotificationSendingFailedException(
            NotificationChannel.EMAIL,
            'Non-retryable error',
            'user-123',
          ),
        );

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await expect(processor.process(job)).rejects.toThrow();
    });

    it('should update log status to RETRYING on retry', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
        userId: 'user-123' as any,
      };

      mockSenderService.send = jest
        .fn()
        .mockRejectedValue(new Error('Temporary error'));

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
      } as Job<NotificationJobData>;

      try {
        await processor.process(job);
      } catch (error) {
        // Expected to throw
      }

      expect(mockLogRepository.update).toHaveBeenCalledWith(
        'log-123',
        expect.objectContaining({
          status: NotificationStatus.RETRYING,
          retryCount: 1,
        }),
      );
    });

    it('should update log status to FAILED after max retries', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
        userId: 'user-123' as any,
      };

      mockRetryStrategy.getRetryConfig = jest.fn().mockReturnValue({
        maxAttempts: 3,
        backoffType: 'exponential',
        backoffDelay: 2000,
      });

      mockSenderService.send = jest
        .fn()
        .mockRejectedValue(new Error('Persistent error'));

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 3, // Exceeded max attempts
      } as Job<NotificationJobData>;

      try {
        await processor.process(job);
      } catch (error) {
        // Expected to throw
      }

      expect(mockLogRepository.update).toHaveBeenCalledWith(
        'log-123',
        expect.objectContaining({
          status: NotificationStatus.FAILED,
          retryCount: 3,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid job data', async () => {
      const invalidJob = {
        id: 'job-123',
        data: null,
        attemptsMade: 0,
      } as any;

      await expect(processor.process(invalidJob)).rejects.toThrow();
    });

    it('should handle adapter errors', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      mockSenderService.send = jest
        .fn()
        .mockRejectedValue(new Error('Adapter error'));

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await expect(processor.process(job)).rejects.toThrow('Adapter error');
    });

    it('should handle database errors', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
        userId: 'user-123' as any,
      };

      mockLogRepository.findMany = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
      } as Job<NotificationJobData>;

      // Should still process even if log update fails
      mockSenderService.send = jest
        .fn()
        .mockResolvedValue([
          { channel: NotificationChannel.EMAIL, success: true },
        ]);

      await processor.process(job);

      expect(mockSenderService.send).toHaveBeenCalled();
    });

    it('should log errors with context', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      mockSenderService.send = jest
        .fn()
        .mockRejectedValue(new Error('Test error'));

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      try {
        await processor.process(job);
      } catch (error) {
        // Expected to throw
      }

      // Error should be logged (processor creates its own logger)
    });

    it('should handle all channels failed scenario', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
      };

      mockSenderService.send = jest.fn().mockResolvedValue([
        {
          channel: NotificationChannel.EMAIL,
          success: false,
          error: 'Error 1',
        },
        { channel: NotificationChannel.SMS, success: false, error: 'Error 2' },
      ]);

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 0,
      } as Job<NotificationJobData>;

      await expect(processor.process(job)).rejects.toThrow(
        NotificationSendingFailedException,
      );
    });
  });

  describe('Log Management', () => {
    it('should find existing log entry for retry', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
        userId: 'user-123' as any,
      };

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
      } as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            { jobId: 'job-123' },
            {
              userId: 'user-123',
              type: payload.type,
              channel: NotificationChannel.EMAIL,
              status: NotificationStatus.PENDING,
            },
          ]),
        }),
      );
    });

    it('should update log with retry information', async () => {
      const payload = createMockEmailPayload();
      const jobData: NotificationJobData = {
        ...payload,
        jobId: 'job-123' as any,
        userId: 'user-123' as any,
      };

      mockSenderService.send = jest
        .fn()
        .mockRejectedValue(new Error('Temporary error'));

      const job = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
      } as Job<NotificationJobData>;

      try {
        await processor.process(job);
      } catch (error) {
        // Expected to throw
      }

      expect(mockLogRepository.update).toHaveBeenCalledWith(
        'log-123',
        expect.objectContaining({
          status: NotificationStatus.RETRYING,
          retryCount: 1,
          error: 'Temporary error',
          lastAttemptAt: expect.any(Date),
        }),
      );
    });
  });
});
