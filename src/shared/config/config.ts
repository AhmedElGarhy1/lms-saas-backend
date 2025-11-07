import { env } from './env.validation';

/**
 * Typed configuration object built from validated environment variables
 * Provides type-safe access to all configuration values with proper type conversions
 * No dependency injection needed - import and use directly
 */
export const Config = {
  app: {
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
    nodeEnv: env.NODE_ENV,
    isProd: env.isProd,
  },

  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
    enableQueryLogging: env.DB_ENABLE_QUERY_LOGGING,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  email: {
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    keyPrefix: env.REDIS_KEY_PREFIX,
  },

  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_PHONE_NUMBER,
    whatsappNumber: env.TWILIO_WHATSAPP_NUMBER,
  },

  whatsapp: {
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
  },

  auth: {
    passwordResetExpiresHours: env.PASSWORD_RESET_EXPIRES_HOURS,
    emailVerificationExpiresHours: env.EMAIL_VERIFICATION_EXPIRES_HOURS,
    phoneVerificationExpiresMinutes: env.PHONE_VERIFICATION_EXPIRES_MINUTES,
  },

  notification: {
    concurrency: env.NOTIFICATION_CONCURRENCY,
    retryThreshold: env.NOTIFICATION_RETRY_THRESHOLD,
    sendMultipleConcurrency: env.NOTIFICATION_SEND_MULTIPLE_CONCURRENCY,
    metricsBatchSize: env.NOTIFICATION_METRICS_BATCH_SIZE,
    metricsFlushIntervalMs: env.NOTIFICATION_METRICS_FLUSH_INTERVAL_MS,
    rateLimit: {
      windowSeconds: env.NOTIFICATION_RATE_LIMIT_WINDOW_SECONDS,
      inApp: env.NOTIFICATION_RATE_LIMIT_IN_APP,
      email: env.NOTIFICATION_RATE_LIMIT_EMAIL,
      sms: env.NOTIFICATION_RATE_LIMIT_SMS,
      whatsapp: env.NOTIFICATION_RATE_LIMIT_WHATSAPP,
      push: env.NOTIFICATION_RATE_LIMIT_PUSH,
    },
    inAppRetry: {
      maxAttempts: env.NOTIFICATION_IN_APP_RETRY_MAX_ATTEMPTS,
      maxDelayMs: env.NOTIFICATION_IN_APP_RETRY_MAX_DELAY_MS,
    },
    retry: {
      email: {
        maxAttempts: env.NOTIFICATION_RETRY_EMAIL_MAX_ATTEMPTS,
        backoffType: env.NOTIFICATION_RETRY_EMAIL_BACKOFF_TYPE as
          | 'exponential'
          | 'fixed',
        backoffDelay: env.NOTIFICATION_RETRY_EMAIL_BACKOFF_DELAY,
      },
      sms: {
        maxAttempts: env.NOTIFICATION_RETRY_SMS_MAX_ATTEMPTS,
        backoffType: env.NOTIFICATION_RETRY_SMS_BACKOFF_TYPE as
          | 'exponential'
          | 'fixed',
        backoffDelay: env.NOTIFICATION_RETRY_SMS_BACKOFF_DELAY,
      },
      whatsapp: {
        maxAttempts: env.NOTIFICATION_RETRY_WHATSAPP_MAX_ATTEMPTS,
        backoffType: env.NOTIFICATION_RETRY_WHATSAPP_BACKOFF_TYPE as
          | 'exponential'
          | 'fixed',
        backoffDelay: env.NOTIFICATION_RETRY_WHATSAPP_BACKOFF_DELAY,
      },
      push: {
        maxAttempts: env.NOTIFICATION_RETRY_PUSH_MAX_ATTEMPTS,
        backoffType: env.NOTIFICATION_RETRY_PUSH_BACKOFF_TYPE as
          | 'exponential'
          | 'fixed',
        backoffDelay: env.NOTIFICATION_RETRY_PUSH_BACKOFF_DELAY,
      },
    },
    timeouts: {
      sms: env.NOTIFICATION_SMS_TIMEOUT_MS,
      email: env.NOTIFICATION_EMAIL_TIMEOUT_MS,
      whatsapp: env.NOTIFICATION_WHATSAPP_TIMEOUT_MS,
      push: env.NOTIFICATION_PUSH_TIMEOUT_MS,
      inApp: env.NOTIFICATION_IN_APP_TIMEOUT_MS,
    },
    inactivityThresholdHours: env.NOTIFICATION_INACTIVITY_THRESHOLD_HOURS,
    idempotency: {
      cacheTtlSeconds: env.NOTIFICATION_IDEMPOTENCY_CACHE_TTL_SECONDS,
      lockTtlSeconds: env.NOTIFICATION_IDEMPOTENCY_LOCK_TTL_SECONDS,
      lockTimeoutMs: env.NOTIFICATION_IDEMPOTENCY_LOCK_TIMEOUT_MS,
    },
    circuitBreaker: {
      errorThreshold: env.NOTIFICATION_CIRCUIT_BREAKER_ERROR_THRESHOLD,
      windowSeconds: env.NOTIFICATION_CIRCUIT_BREAKER_WINDOW_SECONDS,
      resetTimeoutSeconds:
        env.NOTIFICATION_CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS,
    },
    dlq: {
      retentionDays: env.NOTIFICATION_DLQ_RETENTION_DAYS,
    },
    queue: {
      warningThreshold: env.NOTIFICATION_QUEUE_WARNING_THRESHOLD,
      criticalThreshold: env.NOTIFICATION_QUEUE_CRITICAL_THRESHOLD,
    },
    alerts: {
      enabled: env.NOTIFICATION_ALERTS_ENABLED,
      throttleMinutes: env.NOTIFICATION_ALERT_THROTTLE_MINUTES,
    },
  },

  websocket: {
    rateLimit: {
      user: env.WEBSOCKET_RATE_LIMIT_USER,
      ttl: 60, // 1 minute in seconds (hardcoded)
    },
    retry: {
      maxAttempts: env.WEBSOCKET_RETRY_MAX_ATTEMPTS,
      baseDelayMs: env.WEBSOCKET_RETRY_DELAY_MS,
    },
    connectionRateLimit: {
      ip: {
        limit: env.WEBSOCKET_CONNECTION_RATE_LIMIT_IP,
        windowSeconds: env.WEBSOCKET_CONNECTION_RATE_LIMIT_IP_WINDOW,
      },
      user: {
        limit: env.WEBSOCKET_CONNECTION_RATE_LIMIT_USER,
        windowSeconds: env.WEBSOCKET_CONNECTION_RATE_LIMIT_USER_WINDOW,
      },
      failClosed: env.WEBSOCKET_RATE_LIMIT_FAIL_CLOSED,
    },
    connectionTtl: 7 * 24 * 60 * 60, // 7 days in seconds (hardcoded)
  },
} as const;
