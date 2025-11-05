import { config } from 'dotenv';
import { resolve } from 'path';
import { cleanEnv, str, port, url, bool } from 'envalid';

config({ path: resolve(process.cwd(), '.env') });

/**
 * Validates environment variables using envalid
 * Throws validation errors if required variables are missing or invalid
 * @returns Validated environment object
 */
export function validateEnv() {
  const env = cleanEnv(process.env, {
    // Node Environment
    NODE_ENV: str({
      choices: ['development', 'production', 'test'],
      default: 'development',
    }),

    // Application
    PORT: port({ default: 3000 }),
    FRONTEND_URL: url({ default: 'http://localhost:3000' }),

    // Database
    DB_HOST: str({ default: 'localhost' }),
    DB_PORT: port({ default: 5432 }),
    DB_USERNAME: str({ default: 'postgres' }),
    DB_PASSWORD: str({ default: 'root' }),
    DB_NAME: str({ default: 'lms' }),

    // JWT
    JWT_SECRET: str({
      desc: 'JWT secret key for signing tokens',
    }),
    JWT_EXPIRES_IN: str({ default: '15m' }),
    JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),

    // Email Configuration
    EMAIL_HOST: str({ default: 'smtp.gmail.com' }),
    EMAIL_PORT: port({ default: 465 }),
    EMAIL_USER: str({
      desc: 'Email account username',
    }),
    EMAIL_PASS: str({
      desc: 'Email account password or app password',
    }),

    // Redis Configuration
    REDIS_HOST: str({ default: 'localhost' }),
    REDIS_PORT: port({ default: 6379 }),
    REDIS_PASSWORD: str({
      desc: 'Redis password (can be empty for local Redis without password)',
    }),
    REDIS_KEY_PREFIX: str({
      desc: 'Redis key prefix for multi-environment separation',
      default: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
    }),

    // Password Reset
    PASSWORD_RESET_EXPIRES_HOURS: str({ default: '1' }),

    // Email Verification
    EMAIL_VERIFICATION_EXPIRES_HOURS: str({ default: '24' }),

    // Twilio SMS (Required for SMS notifications)
    TWILIO_ACCOUNT_SID: str({
      desc: 'Twilio Account SID for SMS',
    }),
    TWILIO_AUTH_TOKEN: str({
      desc: 'Twilio Auth Token for SMS',
    }),
    TWILIO_PHONE_NUMBER: str({
      desc: 'Twilio Phone Number for SMS',
    }),

    // Twilio WhatsApp (Required for WhatsApp notifications)
    TWILIO_WHATSAPP_NUMBER: str({
      desc: 'Twilio WhatsApp Number',
    }),

    // WhatsApp Business API (Optional - alternative to Twilio)
    WHATSAPP_ACCESS_TOKEN: str({
      desc: 'WhatsApp Business API Access Token',
    }),
    WHATSAPP_PHONE_NUMBER_ID: str({
      desc: 'WhatsApp Business API Phone Number ID',
    }),

    // Notification System
    NOTIFICATION_RETRY_MAX_DELAY_MS: str({
      desc: 'Maximum retry delay in milliseconds for notification delivery (default: 10000)',
      default: '10000',
    }),
    NOTIFICATION_RETRY_MAX_ATTEMPTS: str({
      desc: 'Maximum retry attempts for notification delivery (default: 3)',
      default: '3',
    }),
    NOTIFICATION_CONCURRENCY: str({
      desc: 'Number of concurrent notification jobs to process (default: 5)',
      default: '5',
    }),
    NOTIFICATION_RETRY_THRESHOLD: str({
      desc: 'Retry count threshold for RETRYING vs FAILED status (default: 2)',
      default: '2',
    }),
    NOTIFICATION_SEND_MULTIPLE_CONCURRENCY: str({
      desc: 'Maximum concurrent notifications to process in sendMultiple() (default: 5)',
      default: '5',
    }),
    NOTIFICATION_METRICS_BATCH_SIZE: str({
      desc: 'Metrics batch size before auto-flush (default: 50)',
      default: '50',
    }),
    NOTIFICATION_METRICS_FLUSH_INTERVAL_MS: str({
      desc: 'Metrics flush interval in milliseconds (default: 5000)',
      default: '5000',
    }),
    // Per-Channel Rate Limits (sliding window)
    NOTIFICATION_RATE_LIMIT_IN_APP: str({
      desc: 'Rate limit for IN_APP notifications per minute (default: 100)',
      default: '100',
    }),
    NOTIFICATION_RATE_LIMIT_IN_APP_WINDOW: str({
      desc: 'Time window in seconds for IN_APP rate limit (default: 60)',
      default: '60',
    }),
    NOTIFICATION_RATE_LIMIT_EMAIL: str({
      desc: 'Rate limit for EMAIL notifications per minute (default: 50)',
      default: '50',
    }),
    NOTIFICATION_RATE_LIMIT_EMAIL_WINDOW: str({
      desc: 'Time window in seconds for EMAIL rate limit (default: 60)',
      default: '60',
    }),
    NOTIFICATION_RATE_LIMIT_SMS: str({
      desc: 'Rate limit for SMS notifications per minute (default: 20)',
      default: '20',
    }),
    NOTIFICATION_RATE_LIMIT_SMS_WINDOW: str({
      desc: 'Time window in seconds for SMS rate limit (default: 60)',
      default: '60',
    }),
    NOTIFICATION_RATE_LIMIT_WHATSAPP: str({
      desc: 'Rate limit for WHATSAPP notifications per minute (default: 30)',
      default: '30',
    }),
    NOTIFICATION_RATE_LIMIT_WHATSAPP_WINDOW: str({
      desc: 'Time window in seconds for WHATSAPP rate limit (default: 60)',
      default: '60',
    }),
    NOTIFICATION_RATE_LIMIT_PUSH: str({
      desc: 'Rate limit for PUSH notifications per minute (default: 80)',
      default: '80',
    }),
    NOTIFICATION_RATE_LIMIT_PUSH_WINDOW: str({
      desc: 'Time window in seconds for PUSH rate limit (default: 60)',
      default: '60',
    }),
    // Channel-Specific Retry Strategies
    NOTIFICATION_RETRY_EMAIL_MAX_ATTEMPTS: str({
      desc: 'Maximum retry attempts for EMAIL notifications (default: 3)',
      default: '3',
    }),
    NOTIFICATION_RETRY_EMAIL_BACKOFF_TYPE: str({
      desc: 'Backoff type for EMAIL retries: exponential or fixed (default: exponential)',
      default: 'exponential',
    }),
    NOTIFICATION_RETRY_EMAIL_BACKOFF_DELAY: str({
      desc: 'Backoff delay in milliseconds for EMAIL retries (default: 2000)',
      default: '2000',
    }),
    NOTIFICATION_RETRY_SMS_MAX_ATTEMPTS: str({
      desc: 'Maximum retry attempts for SMS notifications (default: 2)',
      default: '2',
    }),
    NOTIFICATION_RETRY_SMS_BACKOFF_TYPE: str({
      desc: 'Backoff type for SMS retries: exponential or fixed (default: exponential)',
      default: 'exponential',
    }),
    NOTIFICATION_RETRY_SMS_BACKOFF_DELAY: str({
      desc: 'Backoff delay in milliseconds for SMS retries (default: 3000)',
      default: '3000',
    }),
    NOTIFICATION_RETRY_WHATSAPP_MAX_ATTEMPTS: str({
      desc: 'Maximum retry attempts for WHATSAPP notifications (default: 2)',
      default: '2',
    }),
    NOTIFICATION_RETRY_WHATSAPP_BACKOFF_TYPE: str({
      desc: 'Backoff type for WHATSAPP retries: exponential or fixed (default: exponential)',
      default: 'exponential',
    }),
    NOTIFICATION_RETRY_WHATSAPP_BACKOFF_DELAY: str({
      desc: 'Backoff delay in milliseconds for WHATSAPP retries (default: 3000)',
      default: '3000',
    }),
    NOTIFICATION_RETRY_PUSH_MAX_ATTEMPTS: str({
      desc: 'Maximum retry attempts for PUSH notifications (default: 4)',
      default: '4',
    }),
    NOTIFICATION_RETRY_PUSH_BACKOFF_TYPE: str({
      desc: 'Backoff type for PUSH retries: exponential or fixed (default: exponential)',
      default: 'exponential',
    }),
    NOTIFICATION_RETRY_PUSH_BACKOFF_DELAY: str({
      desc: 'Backoff delay in milliseconds for PUSH retries (default: 2000)',
      default: '2000',
    }),

    // WebSocket Configuration
    WEBSOCKET_RATE_LIMIT_USER: str({
      desc: 'Maximum notifications per minute per user (default: 100)',
      default: '100',
    }),
    WEBSOCKET_RATE_LIMIT_SOCKET: str({
      desc: 'Maximum notifications per minute per socket (default: 50)',
      default: '50',
    }),
    WEBSOCKET_RETRY_MAX_ATTEMPTS: str({
      desc: 'Maximum retry attempts for transient Redis errors (default: 3)',
      default: '3',
    }),
    WEBSOCKET_RETRY_DELAY_MS: str({
      desc: 'Base retry delay in milliseconds with exponential backoff (default: 100)',
      default: '100',
    }),

    // Channel Selection Configuration
    NOTIFICATION_INACTIVITY_THRESHOLD_HOURS: str({
      desc: 'Hours threshold for considering user inactive (default: 24)',
      default: '24',
    }),

    DB_ENABLE_QUERY_LOGGING: bool({
      desc: 'Enable database query logging for performance monitoring',
      default: false,
    }),
    WEBSOCKET_CONNECTION_RATE_LIMIT_IP: str({
      desc: 'Maximum connection attempts per IP per window (default: 10)',
      default: '10',
    }),
    WEBSOCKET_CONNECTION_RATE_LIMIT_IP_WINDOW: str({
      desc: 'Time window in seconds for IP rate limit (default: 60)',
      default: '60',
    }),
    WEBSOCKET_CONNECTION_RATE_LIMIT_USER: str({
      desc: 'Maximum connection attempts per user per window (default: 5)',
      default: '5',
    }),
    WEBSOCKET_CONNECTION_RATE_LIMIT_USER_WINDOW: str({
      desc: 'Time window in seconds for user rate limit (default: 60)',
      default: '60',
    }),
    WEBSOCKET_RATE_LIMIT_FAIL_CLOSED: bool({
      desc: 'Fail closed if rate limiter unavailable (default: false)',
      default: false,
    }),
    NOTIFICATION_CONFIG_STRICT_VALIDATION: bool({
      desc: 'Strict validation for notification configuration (default: true)',
      default: true,
    }),
  });

  // Return the validated environment object
  // NestJS ConfigModule will use this to populate ConfigService
  return env;
}
