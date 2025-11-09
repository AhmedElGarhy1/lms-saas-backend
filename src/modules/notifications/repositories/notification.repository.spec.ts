import { Test, TestingModule } from '@nestjs/testing';
import { NotificationRepository } from './notification.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { NotificationType } from '../enums/notification-type.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { createMockLoggerService } from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import { createMockNotification } from '../test/helpers/mock-entities';
import { faker } from '@faker-js/faker';
import { GetInAppNotificationsDto } from '../dto/in-app-notification.dto';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
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

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
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
        NotificationRepository,
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

    repository = module.get<NotificationRepository>(NotificationRepository);

    // Mock base repository methods
    (repository as any).findMany = mockBaseRepository.findMany;
    (repository as any).create = mockBaseRepository.create;
    (repository as any).getRepository = mockBaseRepository.getRepository;
    (repository as any).paginate = mockBaseRepository.paginate;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const notificationData = createMockNotification();
      const createdNotification = { ...notificationData, id: faker.string.uuid() };

      mockBaseRepository.create.mockResolvedValue(createdNotification);

      const result = await repository.createNotification(notificationData);

      expect(mockBaseRepository.create).toHaveBeenCalledWith(notificationData);
      expect(result).toEqual(createdNotification);
    });
  });

  describe('findByUserId', () => {
    it('should find notifications by userId', async () => {
      const userId = faker.string.uuid();
      const mockNotifications = [
        createMockNotification({ userId }),
        createMockNotification({ userId }),
      ];

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([mockNotifications, 2]),
        }),
      });

      const [notifications, count] = await repository.findByUserId(userId);

      expect(notifications).toEqual(mockNotifications);
      expect(count).toBe(2);
    });

    it('should filter by readAt when provided', async () => {
      const userId = faker.string.uuid();
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      });

      await repository.findByUserId(userId, {
        where: { readAt: null },
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.readAt IS NULL',
      );
    });
  });

  describe('findUnread', () => {
    it('should find unread notifications', async () => {
      const userId = faker.string.uuid();
      const mockNotifications = [
        createMockNotification({ userId, readAt: undefined }),
      ];

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockNotifications),
        }),
      });

      const result = await repository.findUnread(userId);

      expect(result).toEqual(mockNotifications);
    });

    it('should filter by profileType when provided', async () => {
      const userId = faker.string.uuid();
      const profileType = ProfileType.ADMIN;

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      });

      await repository.findUnread(userId, profileType);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.profileType = :profileType',
        { profileType },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      const userId = faker.string.uuid();
      const count = 5;

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(count),
        }),
      });

      const result = await repository.getUnreadCount(userId);

      expect(result).toBe(count);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = faker.string.uuid();
      const userId = faker.string.uuid();
      const mockNotification = createMockNotification({
        id: notificationId,
        userId,
      });

      mockBaseRepository.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockNotification),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      });

      await repository.markAsRead(notificationId, userId);

      expect(mockBaseRepository.getRepository().update).toHaveBeenCalledWith(
        { id: notificationId },
        { readAt: expect.any(Date) },
      );
    });

    it('should throw error if notification not found', async () => {
      const notificationId = faker.string.uuid();
      const userId = faker.string.uuid();

      mockBaseRepository.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      await expect(
        repository.markAsRead(notificationId, userId),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const userId = faker.string.uuid();

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 3 }),
        }),
      });

      await repository.markAllAsRead(userId);

      expect(mockBaseRepository.getRepository().createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const notificationIds = [
        faker.string.uuid(),
        faker.string.uuid(),
      ];
      const userId = faker.string.uuid();

      mockBaseRepository.getRepository.mockReturnValue({
        update: jest.fn().mockResolvedValue({ affected: 2 }),
      });

      await repository.markMultipleAsRead(notificationIds, userId);

      expect(mockBaseRepository.getRepository().update).toHaveBeenCalledWith(
        {
          id: In(notificationIds),
          userId,
        },
        { readAt: expect.any(Date) },
      );
    });

    it('should not update if notificationIds is empty', async () => {
      await repository.markMultipleAsRead([], faker.string.uuid());

      expect(mockBaseRepository.getRepository).not.toHaveBeenCalled();
    });
  });

  describe('findNewSince', () => {
    it('should find notifications created since date', async () => {
      const userId = faker.string.uuid();
      const lastReadAt = new Date();
      const mockNotifications = [
        createMockNotification({ userId, createdAt: new Date() }),
      ];

      mockBaseRepository.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue(mockNotifications),
      });

      const result = await repository.findNewSince(userId, lastReadAt);

      expect(result).toEqual(mockNotifications);
    });
  });

  describe('findArchived', () => {
    it('should find archived notifications', async () => {
      const userId = faker.string.uuid();
      const mockNotifications = [
        createMockNotification({ userId, isArchived: true }),
      ];

      mockBaseRepository.getRepository.mockReturnValue({
        findAndCount: jest.fn().mockResolvedValue([mockNotifications, 1]),
      });

      const [notifications, count] = await repository.findArchived(userId);

      expect(notifications).toEqual(mockNotifications);
      expect(count).toBe(1);
    });
  });

  describe('archiveOld', () => {
    it('should archive old notifications', async () => {
      const userId = faker.string.uuid();
      const days = 30;

      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 5 }),
        }),
      });

      await repository.archiveOld(userId, days);

      expect(mockBaseRepository.getRepository().createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired notifications', async () => {
      mockBaseRepository.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 3 }),
        }),
      });

      await repository.deleteExpired();

      expect(mockBaseRepository.getRepository().createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getUserNotificationsWithFilters', () => {
    it('should get user notifications with filters', async () => {
      const userId = faker.string.uuid();
      const query: GetInAppNotificationsDto = {
        page: 1,
        limit: 10,
        read: false,
        type: NotificationType.OTP,
      };

      const mockPagination = {
        items: [createMockNotification({ userId })],
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
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
        }),
      });
      mockBaseRepository.paginate.mockResolvedValue(mockPagination);

      const result = await repository.getUserNotificationsWithFilters(userId, query);

      expect(mockBaseRepository.paginate).toHaveBeenCalled();
      expect(result).toEqual(mockPagination);
    });
  });
});

