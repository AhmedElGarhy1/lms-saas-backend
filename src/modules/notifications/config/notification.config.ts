/**
 * Notification Module Configuration
 *
 * Centralized configuration for the notifications module.
 * Most values are constants with sensible defaults.
 * Only secure values (API keys, secrets) should come from environment variables.
 */

import { Config } from '@/shared/config/config';
import {
  CONCURRENCY_CONSTANTS,
  QUEUE_CONSTANTS,
  RETRY_CONSTANTS,
  TIME_CONSTANTS,
} from '../constants/notification.constants';

/**
 * Notification module configuration
 * Combines constants with secure environment variables
 */
export const NotificationConfig = {
  /**
   * Concurrency configuration
   */
  concurrency: {
    /**
     * Processor concurrency (number of concurrent jobs)
     * Default: 5
     */
    processor: 5,

    /**
     * Maximum recipients processed concurrently per batch
     * Default: 10
     */
    maxRecipientsPerBatch: 10,
  },

  /**
   * Retry threshold for marking notifications as RETRYING vs FAILED
   * Default: 2
   */
  retryThreshold: 2,

  /**
   * Maximum concurrent notifications in sendMultiple()
   * Default: 5
   */
  sendMultipleConcurrency: 5,

  /**
   * Metrics batch size before auto-flush
   * Default: 50
   */
  metricsBatchSize: 50,

  /**
   * Metrics flush interval in milliseconds
   * Default: 5000 (5 seconds)
   */
  metricsFlushIntervalMs: 5000,

  /**
   * Rate limiting configuration
   */
  rateLimit: {
    /**
     * Time window in seconds for all rate limits
     * Default: 60 seconds (1 minute)
     */
    windowSeconds: CONCURRENCY_CONSTANTS.DEFAULT_RATE_LIMIT_WINDOW_SECONDS,

    /**
     * Rate limits per channel (per window)
     */
    inApp: 100,
    email: 50,
    sms: 20,
    whatsapp: 30,
    push: 80,
  },

  /**
   * IN_APP-specific retry configuration (for WebSocket delivery)
   */
  inAppRetry: {
    /**
     * Maximum retry attempts for IN_APP WebSocket delivery
     * Default: 3
     */
    maxAttempts: 3,

    /**
     * Maximum retry delay in milliseconds
     * Default: 10000 (10 seconds)
     */
    maxDelayMs: 10000,
  },

  /**
   * Channel-specific retry strategies
   */
  retry: {
    email: {
      maxAttempts: 3,
      backoffType: 'exponential' as const,
      backoffDelay: RETRY_CONSTANTS.BASE_DELAY_MS,
    },
    sms: {
      maxAttempts: 2,
      backoffType: 'exponential' as const,
      backoffDelay: 3000,
    },
    whatsapp: {
      maxAttempts: 2,
      backoffType: 'exponential' as const,
      backoffDelay: 3000,
    },
    push: {
      maxAttempts: 4,
      backoffType: 'exponential' as const,
      backoffDelay: RETRY_CONSTANTS.BASE_DELAY_MS,
    },
  },

  /**
   * Channel-specific timeouts in milliseconds
   */
  timeouts: {
    sms: 30000, // 30 seconds
    email: 30000, // 30 seconds
    whatsapp: 45000, // 45 seconds
    push: 20000, // 20 seconds
    inApp: 10000, // 10 seconds
  },

  /**
   * User inactivity threshold in hours
   * Used for channel selection (inactive users prefer external channels)
   * Default: 24 hours
   */
  inactivityThresholdHours: 24,

  /**
   * Idempotency cache configuration
   */
  idempotency: {
    /**
     * Cache TTL in seconds
     * Default: 300 (5 minutes)
     */
    cacheTtlSeconds: 300,

    /**
     * Lock TTL in seconds
     * Default: 30 seconds
     */
    lockTtlSeconds: 30,

    /**
     * Lock timeout in milliseconds
     * Default: 100ms
     */
    lockTimeoutMs: 100,
  },

  /**
   * Circuit breaker configuration
   */
  circuitBreaker: {
    /**
     * Error threshold (number of errors before opening circuit)
     * Default: 5
     */
    errorThreshold: 5,

    /**
     * Time window in seconds
     * Default: 60 seconds
     */
    windowSeconds: 60,

    /**
     * Reset timeout in seconds
     * Default: 60 seconds
     */
    resetTimeoutSeconds: 60,
  },

  /**
   * Dead Letter Queue (DLQ) configuration
   */
  dlq: {
    /**
     * Retention period in days
     * Entries older than this are deleted by cleanup job
     * Default: 90 days
     */
    retentionDays: 90,
  },

  /**
   * Queue monitoring thresholds
   */
  queue: {
    /**
     * Warning threshold (number of waiting jobs)
     * Default: 100
     */
    warningThreshold: 100,

    /**
     * Critical threshold (number of waiting jobs)
     * Default: 500
     */
    criticalThreshold: 500,
  },

  /**
   * Alert configuration
   */
  alerts: {
    /**
     * Enable alerts for notification system
     * Default: true
     */
    enabled: true,

    /**
     * Alert throttle in minutes
     * Prevents alert spam
     * Default: 5 minutes
     */
    throttleMinutes: 5,
  },

  /**
   * Template cache TTL in seconds
   * Default: 3600 (1 hour)
   */
  templateCacheTtlSeconds: TIME_CONSTANTS.ONE_HOUR_SECONDS,
} as const;

/**
 * WebSocket configuration
 */
export const WebSocketConfig = {
  /**
   * Rate limiting configuration
   */
  rateLimit: {
    /**
     * Maximum notifications per minute per user
     * Default: 100
     */
    user: 100,

    /**
     * Rate limit TTL in seconds
     * Default: 60 seconds (1 minute)
     */
    ttl: TIME_CONSTANTS.ONE_MINUTE_SECONDS,
  },

  /**
   * Retry configuration for transient Redis errors
   */
  retry: {
    /**
     * Maximum retry attempts
     * Default: 3
     */
    maxAttempts: 3,

    /**
     * Base retry delay in milliseconds (with exponential backoff)
     * Default: 100ms
     */
    baseDelayMs: 100,
  },

  /**
   * Connection rate limiting
   */
  connectionRateLimit: {
    /**
     * IP-based rate limit
     */
    ip: {
      /**
       * Maximum connection attempts per IP per window
       * Default: 10
       */
      limit: 10,

      /**
       * Time window in seconds
       * Default: 60 seconds
       */
      windowSeconds: TIME_CONSTANTS.ONE_MINUTE_SECONDS,
    },

    /**
     * User-based rate limit
     */
    user: {
      /**
       * Maximum connection attempts per user per window
       * Default: 5
       */
      limit: 5,

      /**
       * Time window in seconds
       * Default: 60 seconds
       */
      windowSeconds: TIME_CONSTANTS.ONE_MINUTE_SECONDS,
    },

    /**
     * Fail closed if rate limiter unavailable
     * Default: false (fail-open)
     */
    failClosed: false,
  },

  /**
   * Connection TTL in seconds
   * Default: 7 days
   */
  connectionTtl: TIME_CONSTANTS.SEVEN_DAYS_SECONDS,
} as const;

/**
 * Get notification configuration with secure values from environment
 * This function merges constants with secure env variables
 */
export function getNotificationConfig() {
  return {
    ...NotificationConfig,
    // Secure values come from Config (which reads from env)
    // These are already in Config.notification, so we can reference them if needed
    // For now, we use the constants above as defaults
  };
}

/**
 * Get WebSocket configuration with secure values from environment
 */
export function getWebSocketConfig() {
  return {
    ...WebSocketConfig,
    // Secure values (like JWT_SECRET) are already in Config.jwt.secret
    // and accessed via Config in the adapters
  };
}
