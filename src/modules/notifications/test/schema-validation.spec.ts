import { cleanEnv, str, num, bool, url } from 'envalid';
import { Config } from '@/shared/config/config';
import { NotificationConfig } from '../../config/notification.config';

describe('Schema Validation Tests', () => {
  describe('Environment Variables', () => {
    it('should validate email configuration schema', () => {
      const emailSchema = {
        EMAIL_HOST: str({ desc: 'SMTP host' }),
        EMAIL_PORT: num({ desc: 'SMTP port', default: 587 }),
        EMAIL_USER: str({ desc: 'SMTP username' }),
        EMAIL_PASS: str({ desc: 'SMTP password' }),
      };

      // Test valid configuration
      const validConfig = {
        EMAIL_HOST: 'smtp.example.com',
        EMAIL_PORT: 587,
        EMAIL_USER: 'user@example.com',
        EMAIL_PASS: 'password123',
      };

      expect(() => cleanEnv(validConfig, emailSchema)).not.toThrow();
    });

    it('should reject invalid email port', () => {
      const emailSchema = {
        EMAIL_PORT: num({ desc: 'SMTP port', default: 587 }),
      };

      const invalidConfig = {
        EMAIL_PORT: 'not-a-number',
      };

      // Mock process.exit to prevent test from exiting
      const originalExit = process.exit;
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code}) called`);
      });

      try {
        expect(() => {
          try {
            cleanEnv(invalidConfig, emailSchema);
          } catch (error) {
            throw error;
          }
        }).toThrow();
      } finally {
        exitSpy.mockRestore();
        process.exit = originalExit;
      }
    });

    it('should validate Twilio configuration schema', () => {
      const twilioSchema = {
        TWILIO_ACCOUNT_SID: str({ desc: 'Twilio Account SID' }),
        TWILIO_AUTH_TOKEN: str({ desc: 'Twilio Auth Token' }),
        TWILIO_PHONE_NUMBER: str({ desc: 'Twilio Phone Number' }),
      };

      const validConfig = {
        TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        TWILIO_AUTH_TOKEN: 'auth_token_123',
        TWILIO_PHONE_NUMBER: '+1234567890',
      };

      expect(() => cleanEnv(validConfig, twilioSchema)).not.toThrow();
    });

    it('should validate Redis configuration schema', () => {
      const redisSchema = {
        REDIS_HOST: str({ desc: 'Redis host', default: 'localhost' }),
        REDIS_PORT: num({ desc: 'Redis port', default: 6379 }),
        REDIS_PASSWORD: str({ desc: 'Redis password', default: '' }),
        REDIS_KEY_PREFIX: str({ desc: 'Redis key prefix', default: 'lms:' }),
      };

      const validConfig = {
        REDIS_HOST: 'redis.example.com',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: 'redis_password',
        REDIS_KEY_PREFIX: 'lms:',
      };

      expect(() => cleanEnv(validConfig, redisSchema)).not.toThrow();
    });

    it('should validate notification configuration schema', () => {
      const notificationSchema = {
        NOTIFICATION_CONCURRENCY: num({
          desc: 'Concurrency limit',
          default: 20,
        }),
        NOTIFICATION_RETRY_THRESHOLD: num({
          desc: 'Retry threshold',
          default: 3,
        }),
        NOTIFICATION_IDEMPOTENCY_TTL: num({
          desc: 'Idempotency TTL',
          default: 3600,
        }),
        NOTIFICATION_CIRCUIT_BREAKER_THRESHOLD: num({
          desc: 'Circuit breaker threshold',
          default: 5,
        }),
      };

      const validConfig = {
        NOTIFICATION_CONCURRENCY: 20,
        NOTIFICATION_RETRY_THRESHOLD: 3,
        NOTIFICATION_IDEMPOTENCY_TTL: 3600,
        NOTIFICATION_CIRCUIT_BREAKER_THRESHOLD: 5,
      };

      expect(() => cleanEnv(validConfig, notificationSchema)).not.toThrow();
    });
  });

  describe('Config Constants Validation', () => {
    it('should validate NotificationConfig structure', () => {
      expect(NotificationConfig).toBeDefined();
      expect(NotificationConfig.concurrency).toBeDefined();
      expect(NotificationConfig.concurrency.processor).toBeGreaterThan(0);
      expect(
        NotificationConfig.concurrency.maxRecipientsPerBatch,
      ).toBeGreaterThan(0);
      expect(NotificationConfig.retryThreshold).toBeGreaterThan(0);
      expect(NotificationConfig.idempotency).toBeDefined();
      expect(NotificationConfig.circuitBreaker).toBeDefined();
    });

    it('should validate idempotency config structure', () => {
      expect(NotificationConfig.idempotency.cacheTtlSeconds).toBeGreaterThan(0);
      expect(NotificationConfig.idempotency.lockTtlSeconds).toBeGreaterThan(0);
      expect(NotificationConfig.idempotency.lockTimeoutMs).toBeGreaterThan(0);
    });

    it('should validate circuit breaker config structure', () => {
      expect(NotificationConfig.circuitBreaker.errorThreshold).toBeGreaterThan(
        0,
      );
      expect(NotificationConfig.circuitBreaker.windowSeconds).toBeGreaterThan(
        0,
      );
      expect(
        NotificationConfig.circuitBreaker.resetTimeoutSeconds,
      ).toBeGreaterThan(0);
    });

    it('should validate Config structure', () => {
      expect(Config).toBeDefined();
      expect(Config.email).toBeDefined();
      expect(Config.twilio).toBeDefined();
      expect(Config.redis).toBeDefined();
    });
  });

  describe('Type Safety Validation', () => {
    it('should ensure NotificationConfig types are correct', () => {
      // TypeScript compile-time check - if this compiles, types are correct
      const config: typeof NotificationConfig = NotificationConfig;
      expect(typeof config.concurrency).toBe('object');
      expect(typeof config.concurrency.processor).toBe('number');
      expect(typeof config.concurrency.maxRecipientsPerBatch).toBe('number');
      expect(typeof config.retryThreshold).toBe('number');
      expect(typeof config.idempotency.cacheTtlSeconds).toBe('number');
      expect(typeof config.circuitBreaker.errorThreshold).toBe('number');
    });

    it('should ensure Config types are correct', () => {
      const config: typeof Config = Config;
      expect(typeof config.email.host).toBe('string');
      expect(typeof config.email.port).toBe('number');
      expect(typeof config.twilio.accountSid).toBe('string');
      expect(typeof config.redis.host).toBe('string');
    });
  });
});
