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
    // All numeric/config values moved to NotificationConfig
    // Only secure values remain here (none for notifications - all are numeric/config)
    // Access via NotificationConfig from notification module instead
  },

  websocket: {
    // All numeric/config values moved to WebSocketConfig
    // Only secure values remain here (none for websocket - all are numeric/config)
    // Access via WebSocketConfig from notification module instead
  },
} as const;
