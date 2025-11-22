import { Test, TestingModule } from '@nestjs/testing';
import { PayloadBuilderService } from '../../adapters/payload-builder.service';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import {
  EmailNotificationPayload,
  SmsNotificationPayload,
  WhatsAppNotificationPayload,
  InAppNotificationPayload,
  PushNotificationPayload,
} from '../../types/notification-payload.interface';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  NotificationManifest,
  ChannelManifest,
} from '../../manifests/types/manifest.types';
import { NotificationGroup } from '../../enums/notification-group.enum';
import { NotificationTemplateData } from '../../types/template-data.types';
import { RenderedNotification } from '../../manifests/types/manifest.types';

describe('PayloadBuilderService', () => {
  let service: PayloadBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayloadBuilderService],
    }).compile();

    service = module.get<PayloadBuilderService>(PayloadBuilderService);
  });

  describe('buildBasePayload', () => {
    it('should build base payload with all fields', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        'test@example.com',
        NotificationChannel.EMAIL,
        NotificationType.OTP,
        manifest,
        'en',
        'center-123',
        'user-123',
        ProfileType.STUDENT,
        'profile-123',
        'correlation-123',
      );

      expect(basePayload.recipient).toBe('test@example.com');
      expect(basePayload.channel).toBe(NotificationChannel.EMAIL);
      expect(basePayload.type).toBe(NotificationType.OTP);
      expect(basePayload.group).toBe(NotificationGroup.SECURITY);
      expect(basePayload.locale).toBe('en');
      expect(basePayload.centerId).toBe('center-123');
      expect(basePayload.userId).toBeDefined();
      expect(basePayload.profileType).toBe(ProfileType.STUDENT);
      expect(basePayload.profileId).toBe('profile-123');
      expect(basePayload.correlationId).toBeDefined();
    });

    it('should handle optional fields', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        'test@example.com',
        NotificationChannel.EMAIL,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      expect(basePayload.centerId).toBeUndefined();
      expect(basePayload.profileType).toBeNull();
      expect(basePayload.profileId).toBeNull();
    });
  });

  describe('buildPayload', () => {
    it('should build EMAIL payload', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        'test@example.com',
        NotificationChannel.EMAIL,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.EMAIL,
        subject: 'Test Subject',
        content: '<p>Test Content</p>',
        metadata: { template: 'test-template', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {};

      const payload = service.buildPayload(
        NotificationChannel.EMAIL,
        basePayload,
        rendered,
        templateData,
      );

      expect(payload).not.toBeNull();
      expect((payload as EmailNotificationPayload).subject).toBe(
        'Test Subject',
      );
      expect((payload as EmailNotificationPayload).data.html).toBe(
        '<p>Test Content</p>',
      );
      expect((payload as EmailNotificationPayload).data.template).toBe(
        'test-template',
      );
    });

    it('should return null for EMAIL if subject is missing', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        'test@example.com',
        NotificationChannel.EMAIL,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.EMAIL,
        content: '<p>Test Content</p>',
        metadata: { template: 'test-template', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {};

      const payload = service.buildPayload(
        NotificationChannel.EMAIL,
        basePayload,
        rendered,
        templateData,
      );

      expect(payload).toBeNull();
    });

    it('should build SMS payload', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        '+1234567890',
        NotificationChannel.SMS,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.SMS,
        content: 'Your OTP is 123456',
        metadata: { template: 'otp-template', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {};

      const payload = service.buildPayload(
        NotificationChannel.SMS,
        basePayload,
        rendered,
        templateData,
      );

      expect(payload).not.toBeNull();
      expect((payload as SmsNotificationPayload).data.content).toBe(
        'Your OTP is 123456',
      );
      expect((payload as SmsNotificationPayload).data.template).toBe(
        'otp-template',
      );
    });

    it('should build WHATSAPP payload with template structure', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        '+1234567890',
        NotificationChannel.WHATSAPP,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.WHATSAPP,
        content: '', // Not used for WhatsApp
        metadata: { template: 'auth/otp', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {
        otpCode: '123456',
        expiresIn: '10',
      };

      const channelConfig: ChannelManifest = {
        whatsappTemplateName: 'otp_verification',
        requiredVariables: ['otpCode', 'expiresIn'],
      };

      const payload = service.buildPayload(
        NotificationChannel.WHATSAPP,
        basePayload,
        rendered,
        templateData,
        channelConfig,
      );

      expect(payload).not.toBeNull();
      const whatsappPayload = payload as WhatsAppNotificationPayload;
      expect(whatsappPayload.data.templateName).toBe('otp_verification');
      expect(whatsappPayload.data.templateLanguage).toBe('en');
      expect(whatsappPayload.data.templateParameters).toEqual([
        { type: 'text', text: '123456' },
        { type: 'text', text: '10' },
      ]);
    });

    it('should return null for WHATSAPP payload if template name missing', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        '+1234567890',
        NotificationChannel.WHATSAPP,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.WHATSAPP,
        content: '',
        metadata: { template: 'auth/otp', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {
        otpCode: '123456',
        expiresIn: '10',
      };

      const channelConfig: ChannelManifest = {
        // Missing whatsappTemplateName
        requiredVariables: ['otpCode', 'expiresIn'],
      };

      const payload = service.buildPayload(
        NotificationChannel.WHATSAPP,
        basePayload,
        rendered,
        templateData,
        channelConfig,
      );

      expect(payload).toBeNull();
    });

    it('should build IN_APP payload', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        'user-123',
        NotificationChannel.IN_APP,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.IN_APP,
        content: {
          title: 'Test Title',
          message: 'Test Message',
          expiresAt: new Date(),
        },
        metadata: { template: 'inapp-template', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {
        title: 'Fallback Title',
      };

      const payload = service.buildPayload(
        NotificationChannel.IN_APP,
        basePayload,
        rendered,
        templateData,
      );

      expect(payload).not.toBeNull();
      expect((payload as InAppNotificationPayload).title).toBe('Test Title');
      expect((payload as InAppNotificationPayload).data.message).toBe(
        'Test Message',
      );
    });

    it('should use fallback title for IN_APP if not in content', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        'user-123',
        NotificationChannel.IN_APP,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.IN_APP,
        content: {
          message: 'Test Message',
        },
        metadata: { template: 'inapp-template', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {
        title: 'Fallback Title',
      };

      const payload = service.buildPayload(
        NotificationChannel.IN_APP,
        basePayload,
        rendered,
        templateData,
      );

      expect(payload).not.toBeNull();
      expect((payload as InAppNotificationPayload).title).toBe(
        'Fallback Title',
      );
    });

    it('should build PUSH payload', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        'user-123',
        NotificationChannel.PUSH,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.PUSH,
        content: {
          title: 'Push Title',
          message: 'Push Message',
          data: { key: 'value' },
        },
        metadata: { template: 'push-template', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {
        title: 'Fallback Title',
      };

      const payload = service.buildPayload(
        NotificationChannel.PUSH,
        basePayload,
        rendered,
        templateData,
      );

      expect(payload).not.toBeNull();
      expect((payload as PushNotificationPayload).title).toBe('Push Title');
      expect((payload as PushNotificationPayload).data.message).toBe(
        'Push Message',
      );
    });

    it('should return null for unknown channel', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const basePayload = service.buildBasePayload(
        'test@example.com',
        'UNKNOWN' as NotificationChannel,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
      );

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: 'UNKNOWN' as NotificationChannel,
        content: 'test',
        metadata: { template: 'test', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {};

      const payload = service.buildPayload(
        'UNKNOWN' as NotificationChannel,
        basePayload,
        rendered,
        templateData,
      );

      expect(payload).toBeNull();
    });
  });

  describe('buildCompletePayload', () => {
    it('should build complete payload in one call', () => {
      const manifest: NotificationManifest = {
        type: NotificationType.OTP,
        group: NotificationGroup.SECURITY,
        audiences: {},
      };

      const rendered: RenderedNotification = {
        type: NotificationType.OTP,
        channel: NotificationChannel.EMAIL,
        subject: 'Test Subject',
        content: '<p>Test Content</p>',
        metadata: { template: 'test-template', locale: 'en' },
      };

      const templateData: NotificationTemplateData = {};

      const payload = service.buildCompletePayload(
        'test@example.com',
        NotificationChannel.EMAIL,
        NotificationType.OTP,
        manifest,
        'en',
        undefined,
        'user-123',
        undefined,
        undefined,
        'correlation-123',
        rendered,
        templateData,
      );

      expect(payload).not.toBeNull();
      expect((payload as EmailNotificationPayload).subject).toBe(
        'Test Subject',
      );
      expect((payload as EmailNotificationPayload).recipient).toBe(
        'test@example.com',
      );
    });
  });
});
