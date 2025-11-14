import { Test, TestingModule } from '@nestjs/testing';
import { NotificationListener } from './notification.listener';
import { NotificationService } from '../services/notification.service';
import { Logger } from '@nestjs/common';
import { UserService } from '@/modules/user/services/user.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import {
  createMockLoggerService,
  createMockRecipientInfo,
} from '../test/helpers';
import { TestEnvGuard } from '../test/helpers/test-env-guard';
import {
  OtpEvent,
  PasswordResetRequestedEvent,
  EmailVerificationRequestedEvent,
  PhoneVerifiedEvent,
} from '@/modules/auth/events/auth.events';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
} from '@/modules/centers/events/center.events';
import { faker } from '@faker-js/faker';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { createMockNotificationManifest } from '../test/helpers';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockLogger: Logger;
  let mockUserService: jest.Mocked<UserService>;
  let mockCentersService: jest.Mocked<CentersService>;
  let mockManifestResolver: jest.Mocked<NotificationManifestResolver>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockNotificationService = {
      trigger: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockUserService = {
      findOne: jest.fn(),
    } as any;

    mockCentersService = {
      findCenterById: jest.fn(),
    } as any;

    mockManifestResolver = {
      getManifest: jest.fn(),
      getAudienceConfig: jest.fn(),
      getChannelConfig: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: CentersService,
          useValue: mockCentersService,
        },
        {
          provide: NotificationManifestResolver,
          useValue: mockManifestResolver,
        },
      ],
    }).compile();

    listener = module.get<NotificationListener>(NotificationListener);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOtp', () => {
    it('should trigger OTP notification for valid user', async () => {
      const userId = faker.string.uuid();
      const phone = faker.phone.number();
      const email = faker.internet.email();
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event = new OtpEvent(
        userId,
        '123456',
        5,
        email,
        phone,
      );

      await listener.handleOtp(event);

      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
      expect(mockNotificationService.trigger).toHaveBeenCalledWith(
        NotificationType.OTP,
        expect.objectContaining({
          audience: 'DEFAULT',
          event,
          recipients: [
            expect.objectContaining({
              userId,
              phone,
              email,
              locale,
            }),
          ],
          channels: [NotificationChannel.SMS],
        }),
      );
    });

    it('should skip notification if userId is missing', async () => {
      const event = new OtpEvent(
        undefined as any,
        '123456',
        5,
        faker.internet.email(),
      );

      await listener.handleOtp(event);

      expect(mockUserService.findOne).not.toHaveBeenCalled();
      expect(mockNotificationService.trigger).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should skip notification if user not found', async () => {
      const userId = faker.string.uuid();
      mockUserService.findOne.mockResolvedValue(null);

      const event = new OtpEvent(
        userId,
        '123456',
        5,
        faker.internet.email(),
      );

      await listener.handleOtp(event);

      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
      expect(mockNotificationService.trigger).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should skip notification if recipient validation fails', async () => {
      const userId = faker.string.uuid();
      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(null), // Missing phone
        userInfo: { locale: 'en' },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event = new OtpEvent(
        userId,
        '123456',
        5,
        faker.internet.email(),
      );

      await listener.handleOtp(event);

      expect(mockNotificationService.trigger).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('handlePasswordResetRequested', () => {
    it('should trigger password reset notification', async () => {
      const userId = faker.string.uuid();
      const phone = faker.phone.number();
      const email = faker.internet.email();
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event = new PasswordResetRequestedEvent(
        email,
        userId,
        undefined,
        'reset-token',
      );

      await listener.handlePasswordResetRequested(event);

      expect(mockNotificationService.trigger).toHaveBeenCalledWith(
        NotificationType.PASSWORD_RESET,
        expect.objectContaining({
          audience: 'DEFAULT',
          event,
          recipients: [
            expect.objectContaining({
              userId,
              phone,
              email,
              locale,
            }),
          ],
        }),
      );
    });

    it('should skip notification if userId is missing', async () => {
      const event = new PasswordResetRequestedEvent(
        faker.internet.email(),
        undefined,
        undefined,
        'reset-token',
      );

      await listener.handlePasswordResetRequested(event);

      expect(mockNotificationService.trigger).not.toHaveBeenCalled();
    });
  });

  describe('handleEmailVerificationRequested', () => {
    it('should trigger email verification notification', async () => {
      const userId = faker.string.uuid();
      const phone = faker.phone.number();
      const email = faker.internet.email();
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event = new EmailVerificationRequestedEvent(
        { id: userId } as any,
        userId,
        email,
        'verification-token',
        'https://example.com/verify',
      );

      await listener.handleEmailVerificationRequested(event);

      expect(mockNotificationService.trigger).toHaveBeenCalledWith(
        NotificationType.EMAIL_VERIFICATION,
        expect.objectContaining({
          audience: 'DEFAULT',
          event,
        }),
      );
    });
  });

  describe('handlePhoneVerified', () => {
    it('should trigger phone verified notification', async () => {
      const userId = faker.string.uuid();
      const phone = faker.phone.number();
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event = new PhoneVerifiedEvent(userId, phone, {
        id: userId,
      } as any);

      await listener.handlePhoneVerified(event);

      expect(mockNotificationService.trigger).toHaveBeenCalledWith(
        NotificationType.PHONE_VERIFIED,
        expect.objectContaining({
          audience: 'DEFAULT',
          event,
        }),
      );
    });
  });

  describe('handleCenterCreated', () => {
    it('should trigger center created notifications for owner and admin', async () => {
      const centerId = faker.string.uuid();
      const userId = faker.string.uuid();
      const phone = faker.phone.number();
      const email = faker.internet.email();
      const locale = 'en';

      const actor = {
        id: userId,
        userProfileId: faker.string.uuid(),
        profileType: ProfileType.ADMIN,
        getPhone: jest.fn().mockReturnValue(phone),
        email,
        userInfo: { locale },
      };

      const center = {
        id: centerId,
        name: faker.company.name(),
        email: faker.internet.email(),
      };

      const event = new CreateCenterEvent(center as any, actor as any);

      await listener.handleCenterCreated(event);

      // Should trigger for both OWNER and ADMIN audiences
      expect(mockNotificationService.trigger).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.trigger).toHaveBeenCalledWith(
        NotificationType.CENTER_CREATED,
        expect.objectContaining({
          audience: 'OWNER',
        }),
      );
      expect(mockNotificationService.trigger).toHaveBeenCalledWith(
        NotificationType.CENTER_CREATED,
        expect.objectContaining({
          audience: 'ADMIN',
        }),
      );
    });
  });

  describe('handleCenterUpdated', () => {
    it('should trigger center updated notification', async () => {
      const centerId = faker.string.uuid();
      const userId = faker.string.uuid();
      const phone = faker.phone.number();
      const email = faker.internet.email();
      const locale = 'en';

      const actor = {
        id: userId,
        userProfileId: faker.string.uuid(),
        profileType: ProfileType.ADMIN,
        getPhone: jest.fn().mockReturnValue(phone),
        email,
        userInfo: { locale },
      };

      const center = {
        id: centerId,
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        website: faker.internet.url(),
        description: faker.lorem.paragraph(),
        isActive: true,
      };

      mockCentersService.findCenterById.mockResolvedValue(center as any);

      const event = new UpdateCenterEvent(centerId, {}, actor as any);

      await listener.handleCenterUpdated(event);

      expect(mockCentersService.findCenterById).toHaveBeenCalledWith(centerId);
      expect(mockNotificationService.trigger).toHaveBeenCalledWith(
        NotificationType.CENTER_UPDATED,
        expect.objectContaining({
          audience: 'DEFAULT',
          event: expect.objectContaining({
            center,
          }),
        }),
      );
    });

    it('should handle missing center gracefully', async () => {
      const centerId = faker.string.uuid();
      const userId = faker.string.uuid();
      const phone = faker.phone.number();
      const email = faker.internet.email();
      const locale = 'en';

      const actor = {
        id: userId,
        userProfileId: faker.string.uuid(),
        profileType: ProfileType.ADMIN,
        getPhone: jest.fn().mockReturnValue(phone),
        email,
        userInfo: { locale },
      };

      mockCentersService.findCenterById.mockRejectedValue(
        new Error('Center not found'),
      );

      const event = new UpdateCenterEvent(centerId, {}, actor as any);

      await listener.handleCenterUpdated(event);

      // Should still attempt to trigger notification (will fail validation)
      expect(mockNotificationService.trigger).toHaveBeenCalled();
    });
  });

  describe('validateEventData', () => {
    it('should detect missing required variables', () => {
      const manifest = createMockNotificationManifest({
        type: NotificationType.OTP,
        audiences: {
          DEFAULT: {
            channels: {
              [NotificationChannel.SMS]: {
                template: 'auth/otp' as any,
                requiredVariables: ['otp', 'phone'],
              },
            },
          },
        },
      });

      mockManifestResolver.getManifest.mockReturnValue(manifest);
      mockManifestResolver.getAudienceConfig.mockReturnValue(
        manifest.audiences.DEFAULT,
      );

      const eventData = { otp: '123456' }; // Missing 'phone'

      // Access private method via type assertion for testing
      const result = (listener as any).validateEventData(
        NotificationType.OTP,
        'DEFAULT',
        eventData,
      );

      expect(result).toContain('SMS:phone');
    });

    it('should return empty array when all variables present', () => {
      const manifest = createMockNotificationManifest({
        type: NotificationType.OTP,
        audiences: {
          DEFAULT: {
            channels: {
              [NotificationChannel.SMS]: {
                template: 'auth/otp' as any,
                requiredVariables: ['otp'],
              },
            },
          },
        },
      });

      mockManifestResolver.getManifest.mockReturnValue(manifest);
      mockManifestResolver.getAudienceConfig.mockReturnValue(
        manifest.audiences.DEFAULT,
      );

      const eventData = { otp: '123456' };

      const result = (listener as any).validateEventData(
        NotificationType.OTP,
        'DEFAULT',
        eventData,
      );

      expect(result).toEqual([]);
    });
  });

  describe('validateRecipients', () => {
    it('should filter out recipients without phone', () => {
      const recipients = [
        createMockRecipientInfo({ phone: '+1234567890' }),
        createMockRecipientInfo({ phone: undefined }),
        createMockRecipientInfo({ phone: '+9876543210' }),
      ];

      const result = (listener as any).validateRecipients(
        recipients,
        NotificationType.OTP,
      );

      expect(result).toHaveLength(2);
      expect(result[0].phone).toBe('+1234567890');
      expect(result[1].phone).toBe('+9876543210');
    });

    it('should filter out recipients without locale', () => {
      const recipients = [
        createMockRecipientInfo({ locale: 'en' }),
        createMockRecipientInfo({ locale: undefined }),
        createMockRecipientInfo({ locale: 'ar' }),
      ];

      const result = (listener as any).validateRecipients(
        recipients,
        NotificationType.OTP,
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should log errors when notification trigger fails', async () => {
      const userId = faker.string.uuid();
      const phone = faker.phone.number();
      const email = faker.internet.email();
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);
      mockNotificationService.trigger.mockRejectedValue(
        new Error('Notification failed'),
      );

      const event = new OtpEvent(
        userId,
        '123456',
        5,
        email,
        phone,
      );

      await expect(listener.handleOtp(event)).rejects.toThrow(
        'Notification failed',
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
