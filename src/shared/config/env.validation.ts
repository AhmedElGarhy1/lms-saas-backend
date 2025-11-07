import { config } from 'dotenv';
import { resolve } from 'path';
import { cleanEnv, str, port, url, bool, num } from 'envalid';

config({ path: resolve(process.cwd(), '.env') });

/**
 * Validates environment variables using envalid
 * Throws validation errors if required variables are missing or invalid
 * Exports a typed environment object with proper type conversions
 */
export const env = cleanEnv(process.env, {
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
  PASSWORD_RESET_EXPIRES_HOURS: num({ default: 1 }),

  // Email Verification
  EMAIL_VERIFICATION_EXPIRES_HOURS: num({ default: 24 }),

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
  NOTIFICATION_CONCURRENCY: num({
    desc: 'Number of concurrent notification jobs to process (default: 5)',
    default: 5,
  }),
  NOTIFICATION_RETRY_THRESHOLD: num({
    desc: 'Retry count threshold for RETRYING vs FAILED status (default: 2)',
    default: 2,
  }),
  NOTIFICATION_SEND_MULTIPLE_CONCURRENCY: num({
    desc: 'Maximum concurrent notifications to process in sendMultiple() (default: 5)',
    default: 5,
  }),
  NOTIFICATION_METRICS_BATCH_SIZE: num({
    desc: 'Metrics batch size before auto-flush (default: 50)',
    default: 50,
  }),
  NOTIFICATION_METRICS_FLUSH_INTERVAL_MS: num({
    desc: 'Metrics flush interval in milliseconds (default: 5000)',
    default: 5000,
  }),
  // Per-Channel Rate Limits (sliding window)
  // Single window for all channels (simplified from per-channel windows)
  NOTIFICATION_RATE_LIMIT_WINDOW_SECONDS: num({
    desc: 'Time window in seconds for all rate limits (default: 60)',
    default: 60,
  }),
  NOTIFICATION_RATE_LIMIT_IN_APP: num({
    desc: 'Rate limit for IN_APP notifications per minute (default: 100)',
    default: 100,
  }),
  NOTIFICATION_RATE_LIMIT_EMAIL: num({
    desc: 'Rate limit for EMAIL notifications per minute (default: 50)',
    default: 50,
  }),
  NOTIFICATION_RATE_LIMIT_SMS: num({
    desc: 'Rate limit for SMS notifications per minute (default: 20)',
    default: 20,
  }),
  NOTIFICATION_RATE_LIMIT_WHATSAPP: num({
    desc: 'Rate limit for WHATSAPP notifications per minute (default: 30)',
    default: 30,
  }),
  NOTIFICATION_RATE_LIMIT_PUSH: num({
    desc: 'Rate limit for PUSH notifications per minute (default: 80)',
    default: 80,
  }),
  // IN_APP-specific retry configuration (for WebSocket delivery retries)
  NOTIFICATION_IN_APP_RETRY_MAX_ATTEMPTS: num({
    desc: 'Maximum retry attempts for IN_APP WebSocket delivery (default: 3)',
    default: 3,
  }),
  NOTIFICATION_IN_APP_RETRY_MAX_DELAY_MS: num({
    desc: 'Maximum retry delay in milliseconds for IN_APP WebSocket delivery (default: 10000)',
    default: 10000,
  }),
  // Channel-Specific Retry Strategies
  NOTIFICATION_RETRY_EMAIL_MAX_ATTEMPTS: num({
    desc: 'Maximum retry attempts for EMAIL notifications (default: 3)',
    default: 3,
  }),
  NOTIFICATION_RETRY_EMAIL_BACKOFF_TYPE: str({
    desc: 'Backoff type for EMAIL retries: exponential or fixed (default: exponential)',
    default: 'exponential',
  }),
  NOTIFICATION_RETRY_EMAIL_BACKOFF_DELAY: num({
    desc: 'Backoff delay in milliseconds for EMAIL retries (default: 2000)',
    default: 2000,
  }),
  NOTIFICATION_RETRY_SMS_MAX_ATTEMPTS: num({
    desc: 'Maximum retry attempts for SMS notifications (default: 2)',
    default: 2,
  }),
  NOTIFICATION_RETRY_SMS_BACKOFF_TYPE: str({
    desc: 'Backoff type for SMS retries: exponential or fixed (default: exponential)',
    default: 'exponential',
  }),
  NOTIFICATION_RETRY_SMS_BACKOFF_DELAY: num({
    desc: 'Backoff delay in milliseconds for SMS retries (default: 3000)',
    default: 3000,
  }),
  NOTIFICATION_RETRY_WHATSAPP_MAX_ATTEMPTS: num({
    desc: 'Maximum retry attempts for WHATSAPP notifications (default: 2)',
    default: 2,
  }),
  NOTIFICATION_RETRY_WHATSAPP_BACKOFF_TYPE: str({
    desc: 'Backoff type for WHATSAPP retries: exponential or fixed (default: exponential)',
    default: 'exponential',
  }),
  NOTIFICATION_RETRY_WHATSAPP_BACKOFF_DELAY: num({
    desc: 'Backoff delay in milliseconds for WHATSAPP retries (default: 3000)',
    default: 3000,
  }),
  NOTIFICATION_RETRY_PUSH_MAX_ATTEMPTS: num({
    desc: 'Maximum retry attempts for PUSH notifications (default: 4)',
    default: 4,
  }),
  NOTIFICATION_RETRY_PUSH_BACKOFF_TYPE: str({
    desc: 'Backoff type for PUSH retries: exponential or fixed (default: exponential)',
    default: 'exponential',
  }),
  NOTIFICATION_RETRY_PUSH_BACKOFF_DELAY: num({
    desc: 'Backoff delay in milliseconds for PUSH retries (default: 2000)',
    default: 2000,
  }),

  // WebSocket Configuration
  WEBSOCKET_RATE_LIMIT_USER: num({
    desc: 'Maximum notifications per minute per user (default: 100)',
    default: 100,
  }),
  WEBSOCKET_RETRY_MAX_ATTEMPTS: num({
    desc: 'Maximum retry attempts for transient Redis errors (default: 3)',
    default: 3,
  }),
  WEBSOCKET_RETRY_DELAY_MS: num({
    desc: 'Base retry delay in milliseconds with exponential backoff (default: 100)',
    default: 100,
  }),

  // Channel Selection Configuration
  NOTIFICATION_INACTIVITY_THRESHOLD_HOURS: num({
    desc: 'Hours threshold for considering user inactive (default: 24)',
    default: 24,
  }),

  DB_ENABLE_QUERY_LOGGING: bool({
    desc: 'Enable database query logging for performance monitoring',
    default: false,
  }),
  WEBSOCKET_CONNECTION_RATE_LIMIT_IP: num({
    desc: 'Maximum connection attempts per IP per window (default: 10)',
    default: 10,
  }),
  WEBSOCKET_CONNECTION_RATE_LIMIT_IP_WINDOW: num({
    desc: 'Time window in seconds for IP rate limit (default: 60)',
    default: 60,
  }),
  WEBSOCKET_CONNECTION_RATE_LIMIT_USER: num({
    desc: 'Maximum connection attempts per user per window (default: 5)',
    default: 5,
  }),
  WEBSOCKET_CONNECTION_RATE_LIMIT_USER_WINDOW: num({
    desc: 'Time window in seconds for user rate limit (default: 60)',
    default: 60,
  }),
  WEBSOCKET_RATE_LIMIT_FAIL_CLOSED: bool({
    desc: 'Fail closed if rate limiter unavailable (default: false)',
    default: false,
  }),
  PHONE_VERIFICATION_EXPIRES_MINUTES: num({
    desc: 'Phone verification expires in minutes (default: 10)',
    default: 10,
  }),
  NOTIFICATION_SMS_TIMEOUT_MS: num({
    desc: 'Timeout for SMS notifications in milliseconds (default: 30000)',
    default: 30000,
  }),
  NOTIFICATION_EMAIL_TIMEOUT_MS: num({
    desc: 'Timeout for EMAIL notifications in milliseconds (default: 30000)',
    default: 30000,
  }),
  NOTIFICATION_WHATSAPP_TIMEOUT_MS: num({
    desc: 'Timeout for WHATSAPP notifications in milliseconds (default: 45000)',
    default: 45000,
  }),
  NOTIFICATION_PUSH_TIMEOUT_MS: num({
    desc: 'Timeout for PUSH notifications in milliseconds (default: 20000)',
    default: 20000,
  }),
  NOTIFICATION_IN_APP_TIMEOUT_MS: num({
    desc: 'Timeout for IN_APP notifications in milliseconds (default: 10000)',
    default: 10000,
  }),
  NOTIFICATION_IDEMPOTENCY_CACHE_TTL_SECONDS: num({
    desc: 'Idempotency cache TTL in seconds (default: 300)',
    default: 300,
  }),
  NOTIFICATION_CIRCUIT_BREAKER_ERROR_THRESHOLD: num({
    desc: 'Circuit breaker error threshold (default: 5)',
    default: 5,
  }),
  NOTIFICATION_CIRCUIT_BREAKER_WINDOW_SECONDS: num({
    desc: 'Circuit breaker window in seconds (default: 60)',
    default: 60,
  }),
  NOTIFICATION_CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS: num({
    desc: 'Circuit breaker reset timeout in seconds (default: 60)',
    default: 60,
  }),
  NOTIFICATION_DLQ_RETENTION_DAYS: num({
    desc: 'DLQ retention in days - entries older than this are deleted by cleanup job (default: 90)',
    default: 90,
  }),
  NOTIFICATION_IDEMPOTENCY_LOCK_TTL_SECONDS: num({
    desc: 'Idempotency lock TTL in seconds (default: 30)',
    default: 30,
  }),
  NOTIFICATION_IDEMPOTENCY_LOCK_TIMEOUT_MS: num({
    desc: 'Idempotency lock timeout in milliseconds (default: 100)',
    default: 100,
  }),
  NOTIFICATION_QUEUE_WARNING_THRESHOLD: num({
    desc: 'Queue warning threshold (default: 100)',
    default: 100,
  }),
  NOTIFICATION_QUEUE_CRITICAL_THRESHOLD: num({
    desc: 'Queue critical threshold (default: 500)',
    default: 500,
  }),
  NOTIFICATION_ALERTS_ENABLED: bool({
    desc: 'Enable alerts for notification system (default: true)',
    default: true,
  }),
  NOTIFICATION_ALERT_THROTTLE_MINUTES: num({
    desc: 'Alert throttle in minutes (default: 5)',
    default: 5,
  }),
});

/**
 * Legacy function for backward compatibility with NestJS ConfigModule
 * @deprecated Use the exported `env` object directly instead
 */
export function validateEnv() {
  return env;
}
