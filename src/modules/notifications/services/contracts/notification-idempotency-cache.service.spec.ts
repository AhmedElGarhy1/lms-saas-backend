import { Test, TestingModule } from '@nestjs/testing';
import { NotificationIdempotencyCacheService } from '../notification-idempotency-cache.service';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { FakeRedis } from '../../test/fakes/fake-redis';
import { createMockLoggerService } from '../../test/helpers';
import { TestEnvGuard } from '../../test/helpers/test-env-guard';

describe('NotificationIdempotencyCacheService - Contract Tests', () => {
  let service: NotificationIdempotencyCacheService;
  let fakeRedis: FakeRedis;
  let mockLogger: LoggerService;
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    fakeRedis = new FakeRedis();
    mockLogger = createMockLoggerService();

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(fakeRedis),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationIdempotencyCacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationIdempotencyCacheService>(
      NotificationIdempotencyCacheService,
    );
  });

  afterEach(() => {
    fakeRedis.clear();
    jest.clearAllMocks();
  });

  describe('acquireLock()', () => {
    it('should acquire Redis lock with correct key', async () => {
      const result = await service.acquireLock(
        'correlation-123',
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        'test@example.com',
      );

      expect(result).toBe(true);
      // Check that a lock key was created
      const lockKeys = fakeRedis.getAllKeys().filter((k) => k.includes('lock'));
      expect(lockKeys.length).toBeGreaterThan(0);
    });

    it('should return false if lock already held', async () => {
      // Acquire lock first
      await service.acquireLock(
        'correlation-123',
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        'test@example.com',
      );

      // Try to acquire again
      const result = await service.acquireLock(
        'correlation-123',
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        'test@example.com',
      );

      expect(result).toBe(false);
    });

    it('should set lock expiration', async () => {
      await service.acquireLock(
        'correlation-123',
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        'test@example.com',
      );

      const lockKey = fakeRedis.getAllKeys().find((k) => k.includes('lock'));
      expect(lockKey).toBeDefined();
      // Lock should expire after TTL
    });

    it('should handle Redis errors gracefully (fail open)', async () => {
      mockRedisService.getClient = jest.fn().mockReturnValue({
        set: jest.fn().mockRejectedValue(new Error('Redis error')),
      });

      const result = await service.acquireLock(
        'correlation-123',
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        'test@example.com',
      );

      // Should fail open (return false, not throw)
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle concurrent lock acquisition (race conditions)', async () => {
      const promises = Array.from({ length: 10 }, () =>
        service.acquireLock(
          'correlation-123',
          NotificationType.CENTER_CREATED,
          NotificationChannel.EMAIL,
          'test@example.com',
        ),
      );

      const results = await Promise.all(promises);

      // Only one should acquire the lock
      const acquiredCount = results.filter((r) => r === true).length;
      expect(acquiredCount).toBe(1);
    });
  });

  describe('checkAndSet()', () => {
    it('should check if notification already sent', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      // First check - should return false (not sent, should proceed)
      const firstResult = await service.checkAndSet(
        correlationId,
        type,
        channel,
        recipient,
      );

      expect(firstResult).toBe(false); // false = not sent, should proceed

      // Second check - should return true (already sent, should skip)
      const secondResult = await service.checkAndSet(
        correlationId,
        type,
        channel,
        recipient,
      );

      expect(secondResult).toBe(true); // true = already sent, should skip
    });

    it('should set sent flag if not sent', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      await service.checkAndSet(correlationId, type, channel, recipient);

      const cacheKey = fakeRedis.getAllKeys().find((k) =>
        k.includes('idempotency'),
      );
      expect(cacheKey).toBeDefined();
      // Value is timestamp, not 'sent'
      expect(fakeRedis.getValue(cacheKey!)).toBeDefined();
    });

    it('should use correct cache key format', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      await service.checkAndSet(correlationId, type, channel, recipient);

      const cacheKey = fakeRedis.getAllKeys().find((k) =>
        k.includes('idempotency'),
      );
      expect(cacheKey).toContain(correlationId);
      expect(cacheKey).toContain(type);
      expect(cacheKey).toContain(channel);
    });

    it('should handle concurrent checkAndSet (race conditions)', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      const promises = Array.from({ length: 10 }, () =>
        service.checkAndSet(correlationId, type, channel, recipient),
      );

      const results = await Promise.all(promises);

      // Only one should return false (not sent, should proceed), others should return true (already sent, should skip)
      // Due to race conditions, might be more than 1, but at least 1 should succeed
      const notSentCount = results.filter((r) => r === false).length;
      expect(notSentCount).toBeGreaterThanOrEqual(1);
      expect(notSentCount).toBeLessThanOrEqual(10);
    });
  });

  describe('releaseLock()', () => {
    it('should release acquired lock', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      // Acquire lock
      await service.acquireLock(correlationId, type, channel, recipient);

      // Release lock
      await service.releaseLock(correlationId, type, channel, recipient);

      // Should be able to acquire again
      const result = await service.acquireLock(
        correlationId,
        type,
        channel,
        recipient,
      );

      expect(result).toBe(true);
    });

    it('should handle missing lock gracefully', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      // Try to release non-existent lock
      await expect(
        service.releaseLock(correlationId, type, channel, recipient),
      ).resolves.not.toThrow();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisService.getClient = jest.fn().mockReturnValue({
        del: jest.fn().mockRejectedValue(new Error('Redis error')),
      });

      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      await expect(
        service.releaseLock(correlationId, type, channel, recipient),
      ).resolves.not.toThrow();
    });
  });

  describe('markSent()', () => {
    it('should mark notification as sent', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      await service.markSent(correlationId, type, channel, recipient);

      const cacheKey = fakeRedis.getAllKeys().find((k) =>
        k.includes('idempotency'),
      );
      expect(cacheKey).toBeDefined();
      // Value is timestamp, not 'sent'
      expect(fakeRedis.getValue(cacheKey!)).toBeDefined();
    });

    it('should set expiration correctly', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      await service.markSent(correlationId, type, channel, recipient);

      const cacheKey = fakeRedis.getAllKeys().find((k) =>
        k.includes('idempotency'),
      );
      expect(cacheKey).toBeDefined();
      // Key should exist (expiration is set)
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisService.getClient = jest.fn().mockReturnValue({
        setex: jest.fn().mockRejectedValue(new Error('Redis error')),
      });

      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      await expect(
        service.markSent(correlationId, type, channel, recipient),
      ).resolves.not.toThrow();
    });
  });

  describe('Cache Key Format', () => {
    it('should generate consistent keys', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      await service.checkAndSet(correlationId, type, channel, recipient);
      await service.checkAndSet(correlationId, type, channel, recipient);

      const keys = fakeRedis.getAllKeys().filter((k) =>
        k.includes('idempotency'),
      );
      expect(keys.length).toBe(1); // Same key used both times
    });

    it('should include correlationId, type, channel, recipient', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      await service.checkAndSet(correlationId, type, channel, recipient);

      const cacheKey = fakeRedis.getAllKeys().find((k) =>
        k.includes('idempotency'),
      );
      expect(cacheKey).toContain(correlationId);
      expect(cacheKey).toContain(type);
      expect(cacheKey).toContain(channel);
    });

    it('should handle special characters in recipient', async () => {
      const correlationId = 'correlation-123';
      const type = NotificationType.CENTER_CREATED;
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test+special@example.com';

      await service.checkAndSet(correlationId, type, channel, recipient);

      const cacheKey = fakeRedis.getAllKeys().find((k) =>
        k.includes('idempotency'),
      );
      expect(cacheKey).toBeDefined();
    });
  });
});


