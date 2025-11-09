import { Test, TestingModule } from '@nestjs/testing';
import { NotificationListener } from './notification.listener';
import { NotificationService } from '../services/notification.service';
import { LoggerService } from '@/shared/services/logger.service';
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
  let mockLogger: LoggerService;
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
          provide: LoggerService,
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
      const phone = faker.phone.number('+2##########');
      const email = faker.internet.email();
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event: OtpEvent = {
        userId,
        email,
        otp: '123456',
        type: AuthEvents.OTP,
      };

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
      const event: OtpEvent = {
        userId: undefined as any,
        email: faker.internet.email(),
        otp: '123456',
        type: AuthEvents.OTP,
      };

      await listener.handleOtp(event);

      expect(mockUserService.findOne).not.toHaveBeenCalled();
      expect(mockNotificationService.trigger).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should skip notification if user not found', async () => {
      const userId = faker.string.uuid();
      mockUserService.findOne.mockResolvedValue(null);

      const event: OtpEvent = {
        userId,
        email: faker.internet.email(),
        otp: '123456',
        type: AuthEvents.OTP,
      };

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

      const event: OtpEvent = {
        userId,
        email: faker.internet.email(),
        otp: '123456',
        type: AuthEvents.OTP,
      };

      await listener.handleOtp(event);

      expect(mockNotificationService.trigger).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('handlePasswordResetRequested', () => {
    it('should trigger password reset notification', async () => {
      const userId = faker.string.uuid();
      const phone = faker.phone.number('+2##########');
      const email = faker.internet.email();
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event: PasswordResetRequestedEvent = {
        userId,
        email,
        resetToken: 'reset-token',
        type: AuthEvents.PASSWORD_RESET_REQUESTED,
      };

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
      const event: PasswordResetRequestedEvent = {
        userId: undefined as any,
        email: faker.internet.email(),
        resetToken: 'reset-token',
        type: AuthEvents.PASSWORD_RESET_REQUESTED,
      };

      await listener.handlePasswordResetRequested(event);

      expect(mockNotificationService.trigger).not.toHaveBeenCalled();
    });
  });

  describe('handleEmailVerificationRequested', () => {
    it('should trigger email verification notification', async () => {
      const userId = faker.string.uuid();
      const phone = faker.phone.number('+2##########');
      const email = faker.internet.email();
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event: EmailVerificationRequestedEvent = {
        userId,
        email,
        verificationToken: 'verification-token',
        type: AuthEvents.EMAIL_VERIFICATION_REQUESTED,
      };

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
      const phone = faker.phone.number('+2##########');
      const locale = 'en';

      const mockUser = {
        id: userId,
        getPhone: jest.fn().mockReturnValue(phone),
        userInfo: { locale },
      };

      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const event: PhoneVerifiedEvent = {
        userId,
        phone,
        type: AuthEvents.PHONE_VERIFIED,
      };

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
      const phone = faker.phone.number('+2##########');
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

      const event: CreateCenterEvent = {
        actor: actor as any,
        center: center as any,
        type: CenterEvents.CREATED,
      };

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
      const phone = faker.phone.number('+2##########');
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
        phone: faker.phone.number('+2##########'),
        website: faker.internet.url(),
        description: faker.lorem.paragraph(),
        isActive: true,
      };

      mockCentersService.findCenterById.mockResolvedValue(center as any);

      const event: UpdateCenterEvent = {
        actor: actor as any,
        centerId,
        type: CenterEvents.UPDATED,
      };

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
      const phone = faker.phone.number('+2##########');
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

      const event: UpdateCenterEvent = {
        actor: actor as any,
        centerId,
        type: CenterEvents.UPDATED,
      };

      await listener.handleCenterUpdated(event);

      expect(mockLogger.warn).toHaveBeenCalled();
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
        createMockRecipientInfo({ phone: null }),
        createMockRecipientInfo({ phone: '+9876543210' }),
      ];

      const result = (listener as any).validateRecipients(
        recipients,
        NotificationType.OTP,
      );

      expect(result).toHaveLength(2);
      expect(result[0].phone).toBe('+1234567890');
      expect(result[1].phone).toBe('+9876543210');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should filter out recipients without locale', () => {
      const recipients = [
        createMockRecipientInfo({ locale: 'en' }),
        createMockRecipientInfo({ locale: null }),
        createMockRecipientInfo({ locale: 'ar' }),
      ];

      const result = (listener as any).validateRecipients(
        recipients,
        NotificationType.OTP,
      );

      expect(result).toHaveLength(2);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should log errors when notification trigger fails', async () => {
      const userId = faker.string.uuid();
      const phone = faker.phone.number('+2##########');
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

      const event: OtpEvent = {
        userId,
        email,
        otp: '123456',
        type: AuthEvents.OTP,
      };

      await expect(listener.handleOtp(event)).rejects.toThrow(
        'Notification failed',
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

