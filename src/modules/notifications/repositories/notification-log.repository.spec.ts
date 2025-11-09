import { Test, TestingModule } from '@nestjs/testing';
import { NotificationLogRepository } from './notification-log.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { createMockLoggerService } from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import { createMockNotificationLog } from '../test/helpers/mock-entities';
import { faker } from '@faker-js/faker';
import { GetNotificationHistoryDto } from '../dto/notification-history.dto';
import { In } from 'typeorm';

// Mock BaseRepository methods
const mockBaseRepository = {
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getRepository: jest.fn(),
  paginate: jest.fn(),
};

describe('NotificationLogRepository', () => {
  let repository: NotificationLogRepository;
  let mockLogger: LoggerService;
  let mockTxHost: jest.Mocked<TransactionHost<any>>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockTxHost = {
      tx: {
        withTransaction: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationLogRepository,
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
        {
          provide: TransactionHost,
          useValue: mockTxHost,
        },
      ],
    }).compile();

    repository = module.get<NotificationLogRepository>(
      NotificationLogRepository,
    );

    // Mock base repository methods
    (repository as any).findMany = mockBaseRepository.findMany;
    (repository as any).getRepository = mockBaseRepository.getRepository;
    (repository as any).paginate = mockBaseRepository.paginate;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should find logs by userId', async () => {
      const userId = faker.string.uuid();
      const mockLogs = [
        createMockNotificationLog({ userId }),
        createMockNotificationLog({ userId }),
      ];

      mockBaseRepository.findMany.mockResolvedValue(mockLogs);

      const result = await repository.findByUserId(userId);

      expect(mockBaseRepository.findMany).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByCenterId', () => {
    it('should find logs by centerId', async () => {
      const centerId = faker.string.uuid();
      const mockLogs = [
        createMockNotificationLog({ centerId }),
        createMockNotificationLog({ centerId }),
      ];

      mockBaseRepository.findMany.mockResolvedValue(mockLogs);

      const result = await repository.findByCenterId(centerId);

      expect(mockBaseRepository.findMany).toHaveBeenCalledWith({
        where: { centerId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByStatus', () => {
    it('should find logs by status', async () => {
      const status = NotificationStatus.FAILED;
      const mockLogs = [
        createMockNotificationLog({ status }),
        createMockNotificationLog({ status }),
      ];

      mockBaseRepository.findMany.mockResolvedValue(mockLogs);

      const result = await repository.findByStatus(status);

      expect(mockBaseRepository.findMany).toHaveBeenCalledWith({
        where: { status },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByType', () => {
    it('should find logs by type', async () => {
      const type = NotificationType.OTP;
      const mockLogs = [
        createMockNotificationLog({ type }),
        createMockNotificationLog({ type }),
      ];

      mockBaseRepository.findMany.mockResolvedValue(mockLogs);

      const result = await repository.findByType(type);

      expect(mockBaseRepository.findMany).toHaveBeenCalledWith({
        where: { type },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByChannel', () => {
    it('should find logs by channel', async () => {
      const channel = NotificationChannel.EMAIL;
      const mockLogs = [
        createMockNotificationLog({ channel }),
        createMockNotificationLog({ channel }),
      ];

      mockBaseRepository.findMany.mockResolvedValue(mockLogs);

      const result = await repository.findByChannel(channel);

      expect(mockBaseRepository.findMany).toHaveBeenCalledWith({
        where: { channel },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findUserHistory', () => {
    it('should find user history with filters', async () => {
      const userId = faker.string.uuid();
      const query: GetNotificationHistoryDto = {
        page: 1,
        limit: 10,
        status: NotificationStatus.SENT,
        channel: NotificationChannel.EMAIL,
        type: NotificationType.OTP,
      };

      const mockPagination = {
        items: [createMockNotificationLog({ userId })],
        meta: {
          totalItems: 1,
          itemCount: 1,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      };

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
        }),
      });
      mockBaseRepository.paginate.mockResolvedValue(mockPagination);

      const result = await repository.findUserHistory(userId, query);

      expect(mockBaseRepository.paginate).toHaveBeenCalled();
      expect(result).toEqual(mockPagination);
    });
  });

  describe('deleteOldFailedLogs', () => {
    it('should delete old failed logs', async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const mockDeleteResult = { affected: 5 };

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(mockDeleteResult),
        }),
      });

      const result = await repository.deleteOldFailedLogs(cutoffDate);

      expect(result).toBe(5);
    });
  });

  describe('findLogsByJobIds', () => {
    it('should find logs by job IDs', async () => {
      const jobIds = [faker.string.uuid(), faker.string.uuid()];
      const mockLogs = [
        createMockNotificationLog({ jobId: jobIds[0] }),
        createMockNotificationLog({ jobId: jobIds[1] }),
      ];

      mockBaseRepository.findMany.mockResolvedValue(mockLogs);

      const result = await repository.findLogsByJobIds(jobIds);

      expect(mockBaseRepository.findMany).toHaveBeenCalledWith({
        where: {
          jobId: In(jobIds),
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
    });

    it('should return empty map for empty jobIds array', async () => {
      const result = await repository.findLogsByJobIds([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockBaseRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findLogsByCriteria', () => {
    it('should find logs by criteria', async () => {
      const userId = faker.string.uuid();
      const criteria = [
        {
          userId,
          type: NotificationType.OTP,
          channel: NotificationChannel.SMS,
          statuses: [NotificationStatus.PENDING, NotificationStatus.RETRYING],
        },
      ];

      const mockLogs = [
        createMockNotificationLog({
          userId,
          type: NotificationType.OTP,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.PENDING,
        }),
      ];

      mockBaseRepository.findMany.mockResolvedValue(mockLogs);

      const result = await repository.findLogsByCriteria(criteria);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should return empty map for empty criteria', async () => {
      const result = await repository.findLogsByCriteria([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('batchUpdate', () => {
    it('should batch update logs', async () => {
      const updates = [
        {
          id: faker.string.uuid(),
          data: { status: NotificationStatus.SENT },
        },
        {
          id: faker.string.uuid(),
          data: { status: NotificationStatus.FAILED },
        },
      ];

      mockBaseRepository.getRepository.mockReturnValue({
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      });

      await repository.batchUpdate(updates);

      expect(mockBaseRepository.getRepository().update).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should not update if updates array is empty', async () => {
      await repository.batchUpdate([]);

      expect(mockBaseRepository.getRepository).not.toHaveBeenCalled();
    });
  });
});

