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

  // WhatsApp Business API (Optional - alternative to Twilio)
  WHATSAPP_ACCESS_TOKEN: str({
    desc: 'WhatsApp Business API Access Token',
  }),
  WHATSAPP_PHONE_NUMBER_ID: str({
    desc: 'WhatsApp Business API Phone Number ID',
  }),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: str({
    desc: 'WhatsApp Webhook Verify Token for webhook verification',
  }),
  WHATSAPP_WEBHOOK_APP_SECRET: str({
    desc: 'WhatsApp Webhook App Secret for signature verification',
  }),

  DB_ENABLE_QUERY_LOGGING: bool({
    desc: 'Enable database query logging for performance monitoring',
    default: false,
  }),
  PHONE_VERIFICATION_EXPIRES_MINUTES: num({
    desc: 'Phone verification expires in minutes (default: 10)',
    default: 10,
  }),

  // Payment Gateway Configuration (Paymob)
  PAYMENT_GATEWAY_TYPE: str({
    desc: 'Payment gateway type',
    choices: ['paymob'],
    default: 'paymob',
  }),
  PAYMOB_API_KEY: str({
    desc: 'Paymob API Key for authentication (from Settings → Account Info)',
  }),
  PAYMOB_PUBLIC_KEY: str({
    desc: 'Paymob Public Key',
  }),
  PAYMOB_SECRET_KEY: str({
    desc: 'Paymob Secret Key for API authentication',
  }),
  PAYMOB_HMAC_SECRET: str({
    desc: 'Paymob HMAC Secret for webhook signature validation (different from API secret!)',
  }),

  // Paymob Integration IDs for different payment methods
  // At least one integration ID must be configured for unified checkout
  PAYMOB_CARD_INTEGRATION_ID: str({
    desc: 'Paymob Integration ID for Credit/Debit Cards (from Developers → Payment Integrations)',
    default: '',
  }),
  PAYMOB_WALLET_INTEGRATION_ID: str({
    desc: 'Paymob Integration ID for Mobile Wallets (Vodafone Cash, etc.)',
    default: '',
  }),
  PAYMOB_PAYPAL_INTEGRATION_ID: str({
    desc: 'Paymob Integration ID for PayPal',
    default: '',
  }),
  PAYMOB_KIOSK_INTEGRATION_ID: str({
    desc: 'Paymob Integration ID for Kiosk Payments',
    default: '',
  }),
  PAYMOB_NOTIFICATION_URL: str({
    desc: 'Paymob webhook notification URL',
    default: '',
  }),
  PAYMOB_REDIRECTION_URL: str({
    desc: 'Paymob payment success redirection URL',
    default: '',
  }),
  PAYMOB_TEST_MODE: bool({
    desc: 'Enable Paymob test mode',
    default: true,
  }),

  // Base URL for webhook URL construction
  BASE_URL: str({
    desc: 'Base URL for the application',
    default: 'http://localhost:3000',
  }),

  // Cloudflare R2 Configuration (Optional - for file storage)
  R2_ACCOUNT_ID: str({ desc: 'Cloudflare R2 Account ID', default: '' }),
  R2_ACCESS_KEY_ID: str({ desc: 'R2 Access Key ID', default: '' }),
  R2_SECRET_ACCESS_KEY: str({ desc: 'R2 Secret Access Key', default: '' }),
  R2_BUCKET: str({ desc: 'R2 Bucket name', default: '' }),
  R2_PRESIGNED_URL_EXPIRES: num({
    default: 3600,
    desc: 'Presigned URL expiration in seconds',
  }),
  R2_PUBLIC_URL_DOMAIN: str({
    desc: 'R2 Public URL Domain (e.g., https://assets.hessity.com)',
    default: '',
  }),

  // Firebase Cloud Messaging (FCM) Configuration
  FCM_SERVICE_ACCOUNT_KEY: str({
    desc: 'Firebase service account key as JSON string',
    default: '',
  }),
});

/**
 * Legacy function for backward compatibility with NestJS ConfigModule
 * @deprecated Use the exported `env` object directly instead
 */
export function validateEnv() {
  return env;
}
