import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from './notification.gateway';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { Server, Socket } from 'socket.io';
import { Notification } from '../entities/notification.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { createMockLoggerService } from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import { createMockNotification } from '../test/helpers/mock-entities';
import { faker } from '@faker-js/faker';
import { FakeRedis } from '../test/fakes/fake-redis';

// Mock SlidingWindowRateLimiter
jest.mock('../utils/sliding-window-rate-limit', () => ({
  SlidingWindowRateLimiter: jest.fn().mockImplementation(() => ({
    checkRateLimit: jest.fn().mockResolvedValue(true),
  })),
}));

// Mock retry.util
jest.mock('../utils/retry.util', () => ({
  retryOperation: jest.fn().mockImplementation(async (fn) => fn()),
}));

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockLogger: LoggerService;
  let mockMetrics: jest.Mocked<NotificationMetricsService>;
  let mockServer: jest.Mocked<Server>;
  let fakeRedis: FakeRedis;
  let redisSets: Map<string, Set<string>>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    fakeRedis = new FakeRedis();
    mockLogger = createMockLoggerService();
    mockMetrics = {
      incrementSent: jest.fn().mockResolvedValue(undefined),
      incrementFailed: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Use a simple in-memory store for Redis SET operations
    redisSets = new Map();
    
    const mockRedisClient = {
      sadd: jest.fn().mockImplementation(async (key, value) => {
        if (!redisSets.has(key)) {
          redisSets.set(key, new Set());
        }
        redisSets.get(key)!.add(value);
        return 1;
      }),
      srem: jest.fn().mockImplementation(async (key, value) => {
        const set = redisSets.get(key);
        if (set && set.has(value)) {
          set.delete(value);
          if (set.size === 0) {
            redisSets.delete(key);
          }
          return 1;
        }
        return 0;
      }),
      smembers: jest.fn().mockImplementation(async (key) => {
        const set = redisSets.get(key);
        return set ? Array.from(set) : [];
      }),
      scard: jest.fn().mockImplementation(async (key) => {
        const set = redisSets.get(key);
        return set ? set.size : 0;
      }),
      eval: jest.fn().mockImplementation(async (script, numKeys, key, socketId) => {
        const set = redisSets.get(key);
        const removed = set && set.has(socketId) ? 1 : 0;
        if (set) {
          set.delete(socketId);
          if (set.size === 0) {
            redisSets.delete(key);
          }
        }
        const count = set ? set.size : 0;
        return [removed, count];
      }),
      expire: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      decr: jest.fn().mockResolvedValue(0),
      get: jest.fn().mockImplementation(async (key) => {
        return await fakeRedis.get(key);
      }),
      set: jest.fn().mockImplementation(async (key, value) => {
        await fakeRedis.set(key, value);
        return 'OK';
      }),
      scan: jest.fn().mockImplementation(async (cursor, ...args) => {
        // Simple scan implementation for testing
        // Returns all keys matching pattern
        const matchIndex = args.indexOf('MATCH');
        const pattern = matchIndex >= 0 ? args[matchIndex + 1] : '*';
        const allKeys = Array.from(fakeRedis.store.keys());
        const matchedKeys = pattern === '*' 
          ? allKeys 
          : allKeys.filter(key => {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'));
              return regex.test(key);
            });
        return ['0', matchedKeys];
      }),
      pipeline: jest.fn().mockReturnValue({
        sadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        decr: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]]),
      }),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    } as any;

    mockServer = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
        {
          provide: NotificationMetricsService,
          useValue: mockMetrics,
        },
      ],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
    gateway.server = mockServer;
  });

  afterEach(() => {
    fakeRedis.clear();
    redisSets.clear();
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should add socket to Redis and join user room', async () => {
      const userId = faker.string.uuid();
      const socketId = faker.string.uuid();

      const mockSocket = {
        id: socketId,
        data: { userId },
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockRedisService.getClient().sadd).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should disconnect client if userId is missing', async () => {
      const mockSocket = {
        id: faker.string.uuid(),
        data: {},
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockRedisService.getClient().sadd).not.toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const userId = faker.string.uuid();
      const socketId = faker.string.uuid();

      mockRedisService.getClient().sadd.mockRejectedValueOnce(
        new Error('Redis error'),
      );

      const mockSocket = {
        id: socketId,
        data: { userId },
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket from Redis', async () => {
      const userId = faker.string.uuid();
      const socketId = faker.string.uuid();

      // First add socket
      await fakeRedis.set(`lms:notification:connections:${userId}:${socketId}`, '1');

      const mockSocket = {
        id: socketId,
        data: { userId },
      } as any;

      await gateway.handleDisconnect(mockSocket);

      expect(mockRedisService.getClient().eval).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      const userId = faker.string.uuid();
      const socketId = faker.string.uuid();

      mockRedisService.getClient().eval.mockRejectedValueOnce(
        new Error('Redis error'),
      );

      const mockSocket = {
        id: socketId,
        data: { userId },
      } as any;

      await gateway.handleDisconnect(mockSocket);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('sendToUser', () => {
    it('should send notification to user with active connections', async () => {
      const userId = faker.string.uuid();
      const socketId = faker.string.uuid();
      const notification = createMockNotification({
        userId,
        type: NotificationType.OTP,
      });

      // Add active socket using Redis SET
      const connectionKey = `lms:notification:connections:${userId}`;
      await mockRedisService.getClient().sadd(connectionKey, socketId);

      await gateway.sendToUser(userId, notification as Notification);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockMetrics.incrementSent).toHaveBeenCalledWith(
        NotificationChannel.IN_APP,
        notification.type,
      );
    });

    it('should skip delivery if user has no active connections', async () => {
      const userId = faker.string.uuid();
      const notification = createMockNotification({
        userId,
        type: NotificationType.OTP,
      });

      await gateway.sendToUser(userId, notification as Notification);

      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockMetrics.incrementSent).not.toHaveBeenCalled();
    });

    it('should skip delivery if rate limit exceeded', async () => {
      const userId = faker.string.uuid();
      const notification = createMockNotification({
        userId,
        type: NotificationType.OTP,
      });

      // Mock rate limiter to return false
      const { SlidingWindowRateLimiter } = require('../utils/sliding-window-rate-limit');
      const mockRateLimiter = {
        checkRateLimit: jest.fn().mockResolvedValue(false),
      };
      SlidingWindowRateLimiter.mockImplementation(() => mockRateLimiter);

      // Recreate gateway with new rate limiter
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationGateway,
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
          {
            provide: LoggerService,
            useValue: mockLogger,
          },
          {
            provide: NotificationMetricsService,
            useValue: mockMetrics,
          },
        ],
      }).compile();

      const newGateway = module.get<NotificationGateway>(NotificationGateway);
      newGateway.server = mockServer;

      await newGateway.sendToUser(userId, notification as Notification);

      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle send errors gracefully', async () => {
      const userId = faker.string.uuid();
      const notification = createMockNotification({
        userId,
        type: NotificationType.OTP,
      });

      mockRedisService.getClient().smembers.mockRejectedValueOnce(
        new Error('Redis error'),
      );

      await gateway.sendToUser(userId, notification as Notification);

      expect(mockMetrics.incrementFailed).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserSockets', () => {
    it('should return active socket IDs for user', async () => {
      const userId = faker.string.uuid();
      const socketId1 = faker.string.uuid();
      const socketId2 = faker.string.uuid();

      const connectionKey = `lms:notification:connections:${userId}`;
      await mockRedisService.getClient().sadd(connectionKey, socketId1);
      await mockRedisService.getClient().sadd(connectionKey, socketId2);

      const sockets = await gateway.getUserSockets(userId);

      expect(sockets).toContain(socketId1);
      expect(sockets).toContain(socketId2);
    });
  });

  describe('handleReadAcknowledgment', () => {
    it('should log read acknowledgment', () => {
      const userId = faker.string.uuid();
      const notificationId = faker.string.uuid();

      const mockSocket = {
        data: { userId },
      } as any;

      gateway.handleReadAcknowledgment(mockSocket, { notificationId });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(notificationId),
      );
    });
  });
});

