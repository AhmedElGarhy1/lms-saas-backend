import { Test, TestingModule } from '@nestjs/testing';
import { NotificationManifestResolver } from '../../adapters/notification-manifest-resolver.service';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationRegistry } from '../../adapters/notification-registry';
import { createMockNotificationManifest } from '../../test/helpers';
import { TestEnvGuard } from '../../test/helpers/test-env-guard';
import { NotificationManifest } from '../../types/manifest.types';

describe('NotificationManifestResolver', () => {
  let resolver: NotificationManifestResolver;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationManifestResolver],
    }).compile();

    resolver = module.get<NotificationManifestResolver>(
      NotificationManifestResolver,
    );
  });

  describe('getManifest', () => {
    it('should return manifest for valid notification type', () => {
      const manifest = resolver.getManifest(NotificationType.OTP);

      expect(manifest).toBeDefined();
      expect(manifest.type).toBe(NotificationType.OTP);
      expect(manifest.audiences).toBeDefined();
    });

    it('should throw error for missing manifest', () => {
      // Mock NotificationRegistry to return undefined
      const originalRegistry = NotificationRegistry[NotificationType.OTP];
      (NotificationRegistry as any)[NotificationType.OTP] = undefined;

      expect(() => resolver.getManifest(NotificationType.OTP)).toThrow(
        'Missing manifest for type',
      );

      // Restore
      (NotificationRegistry as any)[NotificationType.OTP] = originalRegistry;
    });
  });

  describe('getAudienceConfig', () => {
    it('should return audience config for valid audience', () => {
      const manifest = resolver.getManifest(NotificationType.OTP);
      const audienceConfig = resolver.getAudienceConfig(manifest, 'DEFAULT');

      expect(audienceConfig).toBeDefined();
      expect(audienceConfig.channels).toBeDefined();
    });

    it('should throw error for invalid audience', () => {
      const manifest = resolver.getManifest(NotificationType.OTP);

      expect(() =>
        resolver.getAudienceConfig(manifest, 'INVALID_AUDIENCE' as any),
      ).toThrow('Audience INVALID_AUDIENCE not supported');
    });
  });

  describe('getChannelConfig', () => {
    it('should return channel config with resolved template path', () => {
      const manifest = resolver.getManifest(NotificationType.OTP);
      const channelConfig = resolver.getChannelConfig(
        manifest,
        'DEFAULT',
        NotificationChannel.SMS,
      );

      expect(channelConfig).toBeDefined();
      expect(channelConfig.template).toBeDefined();
      expect(typeof channelConfig.template).toBe('string');
    });

    it('should resolve template from templateBase if not explicitly provided', () => {
      const manifest = createMockNotificationManifest({
        type: NotificationType.OTP,
        templateBase: 'auth/otp' as any,
        audiences: {
          DEFAULT: {
            channels: {
              [NotificationChannel.EMAIL]: {
                // No explicit template - should be resolved from templateBase
                subject: 'OTP Code',
              },
            },
          },
        },
      });

      const channelConfig = resolver.getChannelConfig(
        manifest,
        'DEFAULT',
        NotificationChannel.EMAIL,
      );

      expect(channelConfig.template).toBe('email/auth/otp');
    });

    it('should use explicit template if provided', () => {
      const manifest = createMockNotificationManifest({
        type: NotificationType.OTP,
        templateBase: 'auth/otp' as any,
        audiences: {
          DEFAULT: {
            channels: {
              [NotificationChannel.EMAIL]: {
                template: 'custom/otp-email' as any,
                subject: 'OTP Code',
              },
            },
          },
        },
      });

      const channelConfig = resolver.getChannelConfig(
        manifest,
        'DEFAULT',
        NotificationChannel.EMAIL,
      );

      expect(channelConfig.template).toBe('custom/otp-email');
    });

    it('should throw error for unsupported channel', () => {
      const manifest = createMockNotificationManifest({
        type: NotificationType.OTP,
        audiences: {
          DEFAULT: {
            channels: {
              [NotificationChannel.EMAIL]: {
                template: 'auth/otp' as any,
                subject: 'OTP',
              },
            },
          },
        },
      });

      expect(() =>
        resolver.getChannelConfig(manifest, 'DEFAULT', NotificationChannel.SMS),
      ).toThrow('Channel SMS not supported');
    });

    it('should throw error if template cannot be resolved', () => {
      const manifest = createMockNotificationManifest({
        type: NotificationType.OTP,
        // No templateBase
        templateBase: undefined,
        audiences: {
          DEFAULT: {
            channels: {
              [NotificationChannel.EMAIL]: {
                subject: 'OTP',
                // Missing template - explicitly set to undefined
                template: undefined as any,
              },
            },
          },
        },
      });

      expect(() =>
        resolver.getChannelConfig(
          manifest,
          'DEFAULT',
          NotificationChannel.EMAIL,
        ),
      ).toThrow('Template path not specified');
    });
  });

  describe('getAvailableAudiences', () => {
    it('should return all available audiences for a manifest', () => {
      const manifest = resolver.getManifest(NotificationType.CENTER_CREATED);
      const audiences = resolver.getAvailableAudiences(manifest);

      expect(audiences).toBeDefined();
      expect(Array.isArray(audiences)).toBe(true);
      expect(audiences.length).toBeGreaterThan(0);
    });
  });

  describe('resolveTemplatePath', () => {
    it('should resolve template path from templateBase', () => {
      const manifest = createMockNotificationManifest({
        type: NotificationType.OTP,
        templateBase: 'auth/otp' as any,
        audiences: {
          DEFAULT: {
            channels: {
              [NotificationChannel.SMS]: {},
            },
          },
        },
      });

      const config =
        manifest.audiences.DEFAULT.channels[NotificationChannel.SMS]!;

      const resolvedPath = (resolver as any).resolveTemplatePath(
        manifest,
        NotificationChannel.SMS,
        config,
      );

      expect(resolvedPath).toBe('sms/auth/otp');
    });

    it('should use explicit template if provided', () => {
      const manifest = createMockNotificationManifest({
        type: NotificationType.OTP,
        templateBase: 'auth/otp' as any,
        audiences: {
          DEFAULT: {
            channels: {
              [NotificationChannel.EMAIL]: {
                template: 'custom/otp' as any,
              },
            },
          },
        },
      });

      const config =
        manifest.audiences.DEFAULT.channels[NotificationChannel.EMAIL]!;

      const resolvedPath = (resolver as any).resolveTemplatePath(
        manifest,
        NotificationChannel.EMAIL,
        config,
      );

      expect(resolvedPath).toBe('custom/otp');
    });
  });
});
