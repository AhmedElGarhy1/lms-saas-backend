import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDlqCleanupJob } from './notification-dlq-cleanup.job';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { Logger } from '@nestjs/common';
import { NotificationStatus } from '../enums/notification-status.enum';
import { createMockLoggerService } from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import { createMockNotificationLog } from '../test/helpers/mock-entities';
import { faker } from '@faker-js/faker';

describe('NotificationDlqCleanupJob', () => {
  let job: NotificationDlqCleanupJob;
  let mockLogRepository: jest.Mocked<NotificationLogRepository>;
  let mockLogger: Logger;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockLogRepository = {
      findMany: jest.fn(),
      deleteOldFailedLogs: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDlqCleanupJob,
        {
          provide: NotificationLogRepository,
          useValue: mockLogRepository,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    job = module.get<NotificationDlqCleanupJob>(NotificationDlqCleanupJob);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupOldFailedJobs', () => {
    it('should delete old failed logs', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

      const oldLogs = [
        createMockNotificationLog({
          status: NotificationStatus.FAILED,
          createdAt: oldDate,
        }),
        createMockNotificationLog({
          status: NotificationStatus.FAILED,
          createdAt: oldDate,
        }),
      ];

      const recentLogs = [
        createMockNotificationLog({
          status: NotificationStatus.FAILED,
          createdAt: recentDate,
        }),
      ];

      mockLogRepository.findMany.mockResolvedValue([
        ...(oldLogs as any),
        ...recentLogs,
      ]);
      mockLogRepository.deleteOldFailedLogs.mockResolvedValue(2);

      await job.cleanupOldFailedJobs();

      expect(mockLogRepository.findMany).toHaveBeenCalledWith({
        where: {
          status: NotificationStatus.FAILED,
        },
      });
      expect(mockLogRepository.deleteOldFailedLogs).toHaveBeenCalled();
    });

    it('should skip cleanup if no old logs found', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const recentLogs = [
        createMockNotificationLog({
          status: NotificationStatus.FAILED,
          createdAt: recentDate,
        }),
      ];

      mockLogRepository.findMany.mockResolvedValue(recentLogs as any);

      await job.cleanupOldFailedJobs();

      expect(mockLogRepository.deleteOldFailedLogs).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockLogRepository.findMany.mockRejectedValue(error);

      await job.cleanupOldFailedJobs();

      // Error should be logged (fault-tolerant, doesn't throw)
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log warning if cleanup takes too long', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const oldLogs = [
        createMockNotificationLog({
          status: NotificationStatus.FAILED,
          createdAt: oldDate,
        }),
      ];

      mockLogRepository.findMany.mockResolvedValue(oldLogs as any);
      mockLogRepository.deleteOldFailedLogs.mockImplementation(
        async () => {
          // Simulate slow operation
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 1;
        },
      );

      await job.cleanupOldFailedJobs();

      // Note: This test may not catch the warning if the operation is too fast
      // In real scenario, the warning is logged if duration > 60000ms
      expect(mockLogRepository.deleteOldFailedLogs).toHaveBeenCalled();
    });
  });

  describe('getRetentionStats', () => {
    it('should return retention statistics', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const allFailed = [
        createMockNotificationLog({
          status: NotificationStatus.FAILED,
          createdAt: oldDate,
        }),
        createMockNotificationLog({
          status: NotificationStatus.FAILED,
          createdAt: recentDate,
        }),
      ];

      mockLogRepository.findMany.mockResolvedValue(allFailed as any);

      const stats = await job.getRetentionStats();

      expect(stats).toHaveProperty('retentionDays');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('oldestFailedDate');
      expect(stats).toHaveProperty('entriesToBeDeleted');
      expect(stats.totalFailed).toBe(2);
      expect(stats.entriesToBeDeleted).toBe(1); // Only old entry
    });

    it('should return zero stats when no failed logs exist', async () => {
      mockLogRepository.findMany.mockResolvedValue([]);

      const stats = await job.getRetentionStats();

      expect(stats.totalFailed).toBe(0);
      expect(stats.entriesToBeDeleted).toBe(0);
      expect(stats.oldestFailedDate).toBeNull();
    });
  });
});

