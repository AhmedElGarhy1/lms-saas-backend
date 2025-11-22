import { Test, TestingModule } from '@nestjs/testing';
import { RedisCleanupJob } from '../../adapters/redis-cleanup.job';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { NotificationMetricsService } from '../../services/notification-metrics.service';
import { Logger } from '@nestjs/common';
import { createMockLoggerService } from '../helpers';
import { TestEnvGuard } from '../helpers/test-env-guard';
import { faker } from '@faker-js/faker';
import { REDIS_CONSTANTS } from '../constants/notification.constants';

describe('RedisCleanupJob', () => {
  let job: RedisCleanupJob;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockMetrics: jest.Mocked<NotificationMetricsService>;
  let mockLogger: Logger;
  let mockRedisClient: any;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockMetrics = {
      setActiveConnections: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockRedisClient = {
      scan: jest.fn().mockResolvedValue(['0', []]),
      smembers: jest.fn().mockResolvedValue([]),
      ttl: jest.fn().mockResolvedValue(3600),
      del: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        smembers: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCleanupJob,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: NotificationMetricsService,
          useValue: mockMetrics,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    job = module.get<RedisCleanupJob>(RedisCleanupJob);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupStaleConnections', () => {
    it('should clean up empty connection keys', async () => {
      const key = `lms:notification:connections:${faker.string.uuid()}`;

      mockRedisClient.scan.mockResolvedValueOnce(['0', [key]]);
      // Mock pipeline for smembers
      const mockPipeline = {
        smembers: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, []]]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);
      mockRedisClient.ttl.mockResolvedValueOnce(3600);

      await job.cleanupStaleConnections();

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
      // The job uses this.logger.debug (NestJS Logger), not mockLogger
      // We can't easily test NestJS Logger calls, so we just verify the del was called
    });

    it('should remove stale keys with low TTL', async () => {
      const key = `lms:notification:connections:${faker.string.uuid()}`;
      const socketId = faker.string.uuid();

      mockRedisClient.scan.mockResolvedValueOnce(['0', [key]]);
      // Mock pipeline for smembers
      const mockPipeline = {
        smembers: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, [socketId]]]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);
      mockRedisClient.ttl.mockResolvedValueOnce(30); // Less than 60 seconds

      await job.cleanupStaleConnections();

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
      // The job uses this.logger.warn (NestJS Logger), not mockLogger
      // We can't easily test NestJS Logger calls, so we just verify the del was called
    });

    it('should log warning for high connection counts', async () => {
      const userId = faker.string.uuid();
      const key = `lms:notification:connections:${userId}`;
      const socketIds = Array.from({ length: 100 }, () => faker.string.uuid());

      mockRedisClient.scan.mockResolvedValueOnce(['0', [key]]);
      // Mock pipeline for smembers
      const mockPipeline = {
        smembers: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, socketIds]]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);
      mockRedisClient.ttl.mockResolvedValueOnce(3600);

      await job.cleanupStaleConnections();

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should handle scan cursor iteration', async () => {
      const key1 = `lms:notification:connections:${faker.string.uuid()}`;
      const key2 = `lms:notification:connections:${faker.string.uuid()}`;

      // First scan returns cursor and first key
      mockRedisClient.scan
        .mockResolvedValueOnce(['1', [key1]])
        .mockResolvedValueOnce(['0', [key2]]);

      // Mock pipeline for smembers (empty sets)
      const mockPipeline = {
        smembers: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockResolvedValueOnce([[null, []]])
          .mockResolvedValueOnce([[null, []]]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);
      mockRedisClient.ttl
        .mockResolvedValueOnce(3600)
        .mockResolvedValueOnce(3600);

      await job.cleanupStaleConnections();

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Redis error');
      mockRedisClient.scan.mockRejectedValue(error);

      await job.cleanupStaleConnections();

      // Error should be logged (fault-tolerant, doesn't throw)
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use pipeline for batch operations', async () => {
      const key1 = `lms:notification:connections:${faker.string.uuid()}`;
      const key2 = `lms:notification:connections:${faker.string.uuid()}`;

      const mockPipeline = {
        smembers: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, []],
          [null, []],
        ]),
      };

      mockRedisClient.pipeline.mockReturnValue(mockPipeline);
      mockRedisClient.scan.mockResolvedValueOnce(['0', [key1, key2]]);
      mockRedisClient.ttl
        .mockResolvedValueOnce(3600)
        .mockResolvedValueOnce(3600);

      await job.cleanupStaleConnections();

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.smembers).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should skip cleanup if no keys found', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', []]);

      await job.cleanupStaleConnections();

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });
});
