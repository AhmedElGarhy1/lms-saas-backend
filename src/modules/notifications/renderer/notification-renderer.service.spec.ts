import { Test, TestingModule } from '@nestjs/testing';
import { NotificationRenderer } from './notification-renderer.service';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import { Logger } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import {
  createMockNotificationManifest,
  createMockLoggerService,
} from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import {
  MissingTemplateVariablesException,
  TemplateRenderingException,
} from '../exceptions/notification.exceptions';

describe('NotificationRenderer', () => {
  let service: NotificationRenderer;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;
  let mockTemplateService: jest.Mocked<NotificationTemplateService>;
  let mockLogger: Logger;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockManifestResolver = {
      getManifest: jest.fn().mockReturnValue(createMockNotificationManifest()),
      getAudienceConfig: jest.fn().mockReturnValue({
        channels: {
          [NotificationChannel.EMAIL]: {
            requiredVariables: ['centerName', 'ownerName'],
            template: 'center-created',
          },
        },
      }),
      getChannelConfig: jest.fn().mockReturnValue({
        requiredVariables: ['centerName', 'ownerName'],
        template: 'center-created',
      }),
    } as any;

    mockTemplateService = {
      renderTemplateWithChannel: jest.fn().mockResolvedValue('<p>Rendered HTML</p>'),
      loadTemplateWithChannel: jest.fn().mockResolvedValue({
        compile: jest.fn().mockReturnValue(() => '<p>Rendered HTML</p>'),
      } as any),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRenderer,
        {
          provide: NotificationManifestResolver,
          useValue: mockManifestResolver,
        },
        {
          provide: NotificationTemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationRenderer>(NotificationRenderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('render()', () => {
    it('should render notification template successfully', async () => {
      const eventData = {
        centerName: 'Test Center',
        ownerName: 'John Doe',
      };

      const result = await service.render(
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        eventData,
        'en',
        'OWNER',
      );

      expect(result.content).toBe('<p>Rendered HTML</p>');
      expect(mockManifestResolver.getManifest).toHaveBeenCalledWith(
        NotificationType.CENTER_CREATED,
      );
      expect(mockTemplateService.renderTemplateWithChannel).toHaveBeenCalledWith(
        'center-created',
        eventData,
        'en',
        NotificationChannel.EMAIL,
      );
    });

    it('should validate required variables', async () => {
      const eventData = {
        centerName: 'Test Center',
        // Missing ownerName
      };

      await expect(
        service.render(
          NotificationType.CENTER_CREATED,
          NotificationChannel.EMAIL,
          eventData,
          'en',
          'OWNER',
        ),
      ).rejects.toThrow(MissingTemplateVariablesException);
    });

    it('should use default audience if not provided', async () => {
      const eventData = {
        centerName: 'Test Center',
        ownerName: 'John Doe',
      };

      await service.render(
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        eventData,
        'en',
      );

      expect(mockManifestResolver.getChannelConfig).toHaveBeenCalled();
    });

    it('should handle template rendering errors with fallback', async () => {
      mockTemplateService.renderTemplateWithChannel = jest
        .fn()
        .mockRejectedValueOnce(new Error('Template error'))
        .mockResolvedValueOnce('<p>Fallback HTML</p>');

      const eventData = {
        centerName: 'Test Center',
        ownerName: 'John Doe',
      };

      const result = await service.render(
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        eventData,
        'en',
      );

      expect(result.content).toBe('<p>Fallback HTML</p>');
      // Warning should be logged for fallback
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should throw TemplateRenderingException if fallback also fails', async () => {
      mockTemplateService.renderTemplateWithChannel = jest
        .fn()
        .mockRejectedValue(new Error('Template error'));

      const eventData = {
        centerName: 'Test Center',
        ownerName: 'John Doe',
      };

      await expect(
        service.render(
          NotificationType.CENTER_CREATED,
          NotificationChannel.EMAIL,
          eventData,
          'en',
        ),
      ).rejects.toThrow(TemplateRenderingException);
    });

    it('should use provided locale', async () => {
      const eventData = {
        centerName: 'Test Center',
        ownerName: 'John Doe',
      };

      await service.render(
        NotificationType.CENTER_CREATED,
        NotificationChannel.EMAIL,
        eventData,
        'ar',
      );

      expect(mockTemplateService.renderTemplateWithChannel).toHaveBeenCalledWith(
        expect.any(String),
        eventData,
        'ar',
        NotificationChannel.EMAIL,
      );
    });

    it('should handle different channels correctly', async () => {
      const eventData = {
        centerName: 'Test Center',
        ownerName: 'John Doe',
      };

      await service.render(
        NotificationType.CENTER_CREATED,
        NotificationChannel.SMS,
        eventData,
        'en',
      );

      expect(mockTemplateService.renderTemplateWithChannel).toHaveBeenCalledWith(
        expect.any(String),
        eventData,
        'en',
        NotificationChannel.SMS,
      );
    });
  });

  describe('validateRequiredVariables()', () => {
    it('should pass when all required variables are present', () => {
      const required = ['centerName', 'ownerName'];
      const eventData = {
        centerName: 'Test Center',
        ownerName: 'John Doe',
      };

      expect(() => {
        (service as any).validateRequiredVariables(
          required,
          eventData,
          NotificationType.CENTER_CREATED,
          NotificationChannel.EMAIL,
        );
      }).not.toThrow();
    });

    it('should throw when required variables are missing', () => {
      const required = ['centerName', 'ownerName'];
      const eventData = {
        centerName: 'Test Center',
        // Missing ownerName
      };

      expect(() => {
        (service as any).validateRequiredVariables(
          required,
          eventData,
          NotificationType.CENTER_CREATED,
          NotificationChannel.EMAIL,
        );
      }).toThrow(MissingTemplateVariablesException);
    });

    it('should handle empty required variables array', () => {
      const required: string[] = [];
      const eventData = {
        centerName: 'Test Center',
      };

      expect(() => {
        (service as any).validateRequiredVariables(
          required,
          eventData,
          NotificationType.CENTER_CREATED,
          NotificationChannel.EMAIL,
        );
      }).not.toThrow();
    });
  });
});


