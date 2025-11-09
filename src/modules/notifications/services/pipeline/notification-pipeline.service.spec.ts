import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPipelineService } from './notification-pipeline.service';
import { ChannelSelectionService } from '../channel-selection.service';
import { NotificationManifestResolver } from '../../manifests/registry/notification-manifest-resolver.service';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  createMockRecipientInfo,
  createMockNotificationEvent,
  createMockNotificationManifest,
  createMockLoggerService,
} from '../../test/helpers';
import { TestEnvGuard } from '../../test/helpers/test-env-guard';
import { NotificationProcessingContext } from './notification-pipeline.service';

describe('NotificationPipelineService', () => {
  let service: NotificationPipelineService;
  let mockChannelSelection: jest.Mocked<ChannelSelectionService>;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;
  let mockLogger: LoggerService;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockChannelSelection = {
      selectOptimalChannels: jest.fn().mockResolvedValue([
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ]),
    } as any;

    mockManifestResolver = {
      getManifest: jest.fn().mockReturnValue(createMockNotificationManifest()),
      getAudienceConfig: jest.fn().mockReturnValue({
        channels: {
          [NotificationChannel.EMAIL]: {},
          [NotificationChannel.IN_APP]: {},
        },
      }),
      getChannelConfig: jest.fn().mockReturnValue({}),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPipelineService,
        {
          provide: ChannelSelectionService,
          useValue: mockChannelSelection,
        },
        {
          provide: NotificationManifestResolver,
          useValue: mockManifestResolver,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationPipelineService>(
      NotificationPipelineService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process()', () => {
    it('should process notification through pipeline steps', async () => {
      const recipient = createMockRecipientInfo();
      const event = createMockNotificationEvent();
      const manifest = createMockNotificationManifest();

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event,
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest,
        audience: 'OWNER',
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      const result = await service.process(context, recipient);

      expect(result.userId).toBe(recipient.userId);
      expect(result.recipient).toBe(recipient.email);
      expect(result.phone).toBe(recipient.phone);
      expect(result.locale).toBe(recipient.locale);
      expect(result.enabledChannels.length).toBeGreaterThan(0);
      expect(result.finalChannels.length).toBeGreaterThan(0);
      expect(result.templateData).toBeDefined();
    });

    it('should extract event data correctly', async () => {
      const recipient = createMockRecipientInfo({
        userId: 'user-456',
        email: 'test@example.com',
        phone: '+1234567890',
        locale: 'ar',
      });
      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest: createMockNotificationManifest(),
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [NotificationChannel.EMAIL],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      await service.process(context, recipient);

      expect(context.userId).toBe('user-456');
      expect(context.recipient).toBe('test@example.com');
      expect(context.phone).toBe('+1234567890');
      expect(context.locale).toBe('ar');
    });

    it('should determine channels from manifest', async () => {
      const recipient = createMockRecipientInfo();
      const manifest = createMockNotificationManifest({
        audiences: {
          OWNER: {
            channels: {
              [NotificationChannel.EMAIL]: {},
              [NotificationChannel.SMS]: {},
            },
          },
        },
      });

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest,
        audience: 'OWNER',
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      await service.process(context, recipient);

      expect(context.enabledChannels).toContain(NotificationChannel.EMAIL);
      expect(context.enabledChannels).toContain(NotificationChannel.SMS);
    });

    it('should filter channels when requestedChannels provided', async () => {
      const recipient = createMockRecipientInfo();
      const manifest = createMockNotificationManifest({
        audiences: {
          OWNER: {
            channels: {
              [NotificationChannel.EMAIL]: {},
              [NotificationChannel.SMS]: {},
              [NotificationChannel.IN_APP]: {},
            },
          },
        },
      });

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest,
        audience: 'OWNER',
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        requestedChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      await service.process(context, recipient);

      expect(context.enabledChannels).toContain(NotificationChannel.EMAIL);
      expect(context.enabledChannels).toContain(NotificationChannel.IN_APP);
      expect(context.enabledChannels).not.toContain(NotificationChannel.SMS);
    });

    it('should select optimal channels using ChannelSelectionService', async () => {
      const recipient = createMockRecipientInfo();
      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest: createMockNotificationManifest(),
        audience: 'OWNER',
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [
          NotificationChannel.EMAIL,
          NotificationChannel.SMS,
          NotificationChannel.IN_APP,
        ],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      await service.process(context, recipient);

      expect(mockChannelSelection.selectOptimalChannels).toHaveBeenCalledWith(
        expect.arrayContaining([
          NotificationChannel.EMAIL,
          NotificationChannel.SMS,
          NotificationChannel.IN_APP,
        ]),
        recipient,
      );
      expect(context.finalChannels.length).toBeGreaterThan(0);
    });

    it('should prepare template data with event and recipient info', async () => {
      const recipient = createMockRecipientInfo({
        userId: 'user-789',
        email: 'template@example.com',
      });
      const event = createMockNotificationEvent({
        centerName: 'Test Center',
        creatorName: 'Admin',
      });

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event,
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest: createMockNotificationManifest(),
        audience: 'OWNER',
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [NotificationChannel.EMAIL],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      await service.process(context, recipient);

      expect(context.templateData.userId).toBe('user-789');
      expect(context.templateData.email).toBe('template@example.com');
      expect((context.templateData as any).centerName).toBe('Test Center');
      expect((context.templateData as any).creatorName).toBe('Admin');
    });

    it('should skip processing if no enabled channels', async () => {
      const recipient = createMockRecipientInfo();
      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest: createMockNotificationManifest({
          audiences: {
            OWNER: {
              channels: {},
            },
          },
        }),
        audience: 'OWNER',
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      await service.process(context, recipient);

      expect(mockChannelSelection.selectOptimalChannels).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('No enabled channels'),
        'NotificationPipelineService',
        expect.any(Object),
      );
    });
  });

  describe('extractEventData()', () => {
    it('should extract recipient information correctly', () => {
      const recipient = createMockRecipientInfo({
        userId: 'extract-user',
        email: 'extract@example.com',
        phone: '+9876543210',
        locale: 'ar',
        centerId: 'center-extract',
        profileType: ProfileType.ADMIN,
        profileId: 'profile-extract',
      });

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest: createMockNotificationManifest(),
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      service.extractEventData(context, recipient);

      expect(context.userId).toBe('extract-user');
      expect(context.recipient).toBe('extract@example.com');
      expect(context.phone).toBe('+9876543210');
      expect(context.locale).toBe('ar');
      expect(context.centerId).toBe('center-extract');
      expect(context.profileType).toBe(ProfileType.ADMIN);
      expect(context.profileId).toBe('profile-extract');
    });

    it('should use phone as recipient if email not available', () => {
      const recipient = createMockRecipientInfo({
        email: undefined,
        phone: '+1111111111',
      });

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest: createMockNotificationManifest(),
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      service.extractEventData(context, recipient);

      expect(context.recipient).toBe('+1111111111');
    });

    it('should default locale to en if not provided', () => {
      const recipient = createMockRecipientInfo({
        locale: undefined,
      });

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest: createMockNotificationManifest(),
        correlationId: 'test-corr-id',
        recipient: recipient.email || recipient.phone || '',
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      service.extractEventData(context, recipient);

      expect(context.locale).toBe('en');
    });
  });

  describe('determineChannels()', () => {
    it('should get channels from manifest for audience', () => {
      const manifest = createMockNotificationManifest({
        audiences: {
          OWNER: {
            channels: {
              [NotificationChannel.EMAIL]: {},
              [NotificationChannel.SMS]: {},
            },
          },
        },
      });

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest,
        audience: 'OWNER',
        correlationId: 'test-corr-id',
        recipient: 'test@example.com',
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      service.determineChannels(context);

      expect(context.enabledChannels).toContain(NotificationChannel.EMAIL);
      expect(context.enabledChannels).toContain(NotificationChannel.SMS);
    });

    it('should return empty array if manifest not found', () => {
      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest: null as any,
        correlationId: 'test-corr-id',
        recipient: 'test@example.com',
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      service.determineChannels(context);

      expect(context.enabledChannels).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No manifest found'),
        'NotificationPipelineService',
      );
    });

    it('should validate requested channels against manifest', () => {
      const manifest = createMockNotificationManifest({
        audiences: {
          OWNER: {
            channels: {
              [NotificationChannel.EMAIL]: {},
              [NotificationChannel.IN_APP]: {},
            },
          },
        },
      });

      const context: NotificationProcessingContext = {
        eventName: NotificationType.CENTER_CREATED,
        event: createMockNotificationEvent(),
        mapping: { type: NotificationType.CENTER_CREATED },
        manifest,
        audience: 'OWNER',
        correlationId: 'test-corr-id',
        recipient: 'test@example.com',
        requestedChannels: [
          NotificationChannel.EMAIL,
          NotificationChannel.SMS, // Not in manifest
        ],
        enabledChannels: [],
        finalChannels: [],
        templateData: {} as any,
        locale: 'en',
      };

      service.determineChannels(context);

      expect(context.enabledChannels).toContain(NotificationChannel.EMAIL);
      expect(context.enabledChannels).not.toContain(NotificationChannel.SMS);
    });
  });
});

