import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InAppAdapter } from '../../adapters/in-app.adapter';
import { NotificationRepository } from '../../repositories/notification.repository';
import { NotificationGateway } from '../../gateways/notification.gateway';
import { NotificationLogRepository } from '../../repositories/notification-log.repository';
import { NotificationMetricsService } from '../../services/notification-metrics.service';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import {
  createMockInAppPayload,
  createMockMetricsService,
} from '../helpers';
import { TestEnvGuard } from '../helpers/test-env-guard';
import { createMockNotification } from '../helpers/mock-entities';
import { NotificationStatus } from '../../enums/notification-status.enum';
import { InvalidOperationException } from '@/shared/common/exceptions/custom.exceptions';

describe('InAppAdapter', () => {
  let adapter: InAppAdapter;
  let mockRepository: jest.Mocked<NotificationRepository>;
  let mockGateway: jest.Mocked<NotificationGateway>;
  let mockLogRepository: jest.Mocked<NotificationLogRepository>;
  let mockMetrics: NotificationMetricsService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockMetrics = createMockMetricsService();

    const mockNotification = createMockNotification({
      id: 'notification-123',
      userId: 'user-123',
      type: NotificationType.CENTER_CREATED,
      title: 'Test Title',
      message: 'Test message',
      createdAt: new Date(),
      status: NotificationStatus.PENDING,
    });

    mockRepository = {
      createNotification: jest.fn().mockResolvedValue(mockNotification),
      update: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockGateway = {
      sendToUser: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockLogRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'log-123',
        type: NotificationType.CENTER_CREATED,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
      }),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppAdapter,
        {
          provide: NotificationRepository,
          useValue: mockRepository,
        },
        {
          provide: NotificationGateway,
          useValue: mockGateway,
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
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    adapter = module.get<InAppAdapter>(InAppAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send()', () => {
    it('should create notification entity', async () => {
      const payload = createMockInAppPayload();

      await adapter.send(payload);

      expect(mockRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
        }),
      );
    });

    it('should emit created event', async () => {
      const payload = createMockInAppPayload();

      await adapter.send(payload);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should deliver via WebSocket', async () => {
      const payload = createMockInAppPayload();

      await adapter.send(payload);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        payload.userId,
        expect.any(Object),
      );
    });

    it('should update notification status on success', async () => {
      const payload = createMockInAppPayload();

      await adapter.send(payload);

      expect(mockRepository.update).toHaveBeenCalledWith(
        'notification-123',
        expect.objectContaining({
          status: expect.any(String),
        }),
      );
    });

    it('should create audit log', async () => {
      const payload = createMockInAppPayload();

      await adapter.send(payload);

      expect(mockLogRepository.create).toHaveBeenCalled();
    });

    it('should track metrics on success', async () => {
      const payload = createMockInAppPayload();

      await adapter.send(payload);

      expect(mockMetrics.incrementSent).toHaveBeenCalledWith(
        NotificationChannel.IN_APP,
        payload.type,
      );
      expect(mockMetrics.recordLatency).toHaveBeenCalledWith(
        NotificationChannel.IN_APP,
        expect.any(Number),
      );
    });

    it('should handle database errors', async () => {
      const payload = createMockInAppPayload();
      mockRepository.createNotification = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(adapter.send(payload)).rejects.toThrow('Database error');
    });

    it('should handle WebSocket errors with retry', async () => {
      const payload = createMockInAppPayload();
      mockGateway.sendToUser = jest
        .fn()
        .mockRejectedValueOnce(new Error('WebSocket error'))
        .mockResolvedValueOnce(undefined);

      await adapter.send(payload);

      // Should retry and eventually succeed
      expect(mockGateway.sendToUser).toHaveBeenCalledTimes(2);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should handle missing userId', async () => {
      const payload = createMockInAppPayload();
      payload.userId = undefined;

      await expect(adapter.send(payload)).rejects.toThrow(
        InvalidOperationException,
      );
    });

    it('should extract notification data correctly', async () => {
      const payload = createMockInAppPayload();
      payload.title = 'Custom Title';
      payload.data.message = 'Custom message';

      await adapter.send(payload);

      expect(mockRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Title',
          message: 'Custom message',
        }),
      );
    });

    it('should retry WebSocket delivery on failure', async () => {
      const payload = createMockInAppPayload();
      mockGateway.sendToUser = jest
        .fn()
        .mockRejectedValueOnce(new Error('Connection error'))
        .mockRejectedValueOnce(new Error('Connection error'))
        .mockResolvedValueOnce(undefined);

      await adapter.send(payload);

      expect(mockGateway.sendToUser).toHaveBeenCalledTimes(3);
    });

    it('should update status to FAILED after max retries', async () => {
      const payload = createMockInAppPayload();
      mockGateway.sendToUser = jest
        .fn()
        .mockRejectedValue(new Error('Persistent error'));

      await adapter.send(payload);

      expect(mockRepository.update).toHaveBeenCalledWith(
        'notification-123',
        expect.objectContaining({
          status: 'FAILED',
        }),
      );
    });

    it('should track metrics on failure', async () => {
      const payload = createMockInAppPayload();
      mockGateway.sendToUser = jest
        .fn()
        .mockRejectedValue(new Error('Persistent error'));

      await adapter.send(payload);

      expect(mockMetrics.incrementFailed).toHaveBeenCalledWith(
        NotificationChannel.IN_APP,
        payload.type,
      );
    });
  });
});
