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
    baseUrl: env.BASE_URL,
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
  },

  whatsapp: {
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    webhookVerifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    webhookAppSecret: env.WHATSAPP_WEBHOOK_APP_SECRET,
  },

  auth: {
    passwordResetExpiresHours: env.PASSWORD_RESET_EXPIRES_HOURS,
    phoneVerificationExpiresMinutes: env.PHONE_VERIFICATION_EXPIRES_MINUTES,
  },

  payment: {
    gatewayType: env.PAYMENT_GATEWAY_TYPE,
    paymob: {
      apiKey: env.PAYMOB_API_KEY,
      publicKey: env.PAYMOB_PUBLIC_KEY,
      secretKey: env.PAYMOB_SECRET_KEY,
      hmacSecret: env.PAYMOB_HMAC_SECRET,

      // Integration IDs for different payment methods
      cardIntegrationId: env.PAYMOB_CARD_INTEGRATION_ID,
      walletIntegrationId: env.PAYMOB_WALLET_INTEGRATION_ID,
      paypalIntegrationId: env.PAYMOB_PAYPAL_INTEGRATION_ID,

      // Iframe ID for hosted checkout
      iframeId: env.PAYMOB_IFRAME_ID,

      // Legacy field for backward compatibility
      integrationId: env.PAYMOB_INTEGRATION_ID,

      notificationUrl: env.PAYMOB_NOTIFICATION_URL,
      redirectionUrl: env.PAYMOB_REDIRECTION_URL,
      testMode: env.PAYMOB_TEST_MODE,
    },
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
