/**
 * Notification Module Constants
 *
 * Centralized constants for the notifications module to avoid magic numbers
 * and improve maintainability.
 */

/**
 * Time constants (in seconds)
 */
export const TIME_CONSTANTS = {
  /** 1 hour in seconds */
  ONE_HOUR_SECONDS: 3600,
  /** 1 day in seconds */
  ONE_DAY_SECONDS: 24 * 3600,
  /** 7 days in seconds */
  SEVEN_DAYS_SECONDS: 7 * 24 * 3600,
  /** 30 days in seconds */
  THIRTY_DAYS_SECONDS: 30 * 24 * 60 * 60,
  /** 1 minute in seconds */
  ONE_MINUTE_SECONDS: 60,
  /** 5 minutes in seconds */
  FIVE_MINUTES_SECONDS: 5 * 60,
} as const;

/**
 * Time constants (in milliseconds)
 */
export const TIME_CONSTANTS_MS = {
  /** 1 hour in milliseconds */
  ONE_HOUR_MS: 60 * 60 * 1000,
  /** 1 day in milliseconds */
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  /** 1 second in milliseconds */
  ONE_SECOND_MS: 1000,
  /** 1 minute in milliseconds */
  ONE_MINUTE_MS: 60 * 1000,
} as const;

/**
 * Cache and storage constants
 */
export const CACHE_CONSTANTS = {
  /** Maximum size for in-memory compiled template cache (LRU limit) */
  MAX_COMPILED_CACHE_SIZE: 100,
  /** Default cache TTL in seconds (1 hour) */
  DEFAULT_CACHE_TTL_SECONDS: TIME_CONSTANTS.ONE_HOUR_SECONDS,
  /** Activity cache TTL in milliseconds (1 hour) */
  ACTIVITY_CACHE_TTL_MS: TIME_CONSTANTS_MS.ONE_HOUR_MS,
  /** Rate limit cache TTL in seconds (1 minute) */
  RATE_LIMIT_CACHE_TTL_SECONDS: TIME_CONSTANTS.ONE_MINUTE_SECONDS,
  /** In-app notification cache TTL in seconds (5 minutes) */
  IN_APP_CACHE_TTL_SECONDS: TIME_CONSTANTS.FIVE_MINUTES_SECONDS,
} as const;

/**
 * Queue and job constants
 */
export const QUEUE_CONSTANTS = {
  /** Age to keep completed jobs (24 hours in seconds) */
  COMPLETED_JOB_AGE_SECONDS: TIME_CONSTANTS.ONE_DAY_SECONDS,
  /** Age to keep failed jobs (7 days in seconds) */
  FAILED_JOB_AGE_SECONDS: TIME_CONSTANTS.SEVEN_DAYS_SECONDS,
  /** Default job retry attempts */
  DEFAULT_RETRY_ATTEMPTS: 3,
  /** Default backoff delay in milliseconds */
  DEFAULT_BACKOFF_DELAY_MS: 2000,
} as const;

/**
 * Concurrency and rate limit constants
 */
export const CONCURRENCY_CONSTANTS = {
  /** Default concurrency limit for notification processing */
  DEFAULT_CONCURRENCY_LIMIT: 20,
  /** Default rate limit for channels (fallback) */
  DEFAULT_RATE_LIMIT: 100,
  /** Default rate limit window in seconds */
  DEFAULT_RATE_LIMIT_WINDOW_SECONDS: TIME_CONSTANTS.ONE_MINUTE_SECONDS,
} as const;

/**
 * String and display constants
 */
export const STRING_CONSTANTS = {
  /** Maximum length for recipient hash (base64 encoded) */
  MAX_RECIPIENT_HASH_LENGTH: 50,
  /** Maximum length for logged recipient (for privacy) */
  MAX_LOGGED_RECIPIENT_LENGTH: 20,
  /** Maximum length for logged message preview */
  MAX_LOGGED_MESSAGE_LENGTH: 100,
  /** Maximum length for notification title */
  MAX_NOTIFICATION_TITLE_LENGTH: 100,
  /** Maximum length for notification error message */
  MAX_NOTIFICATION_ERROR_LENGTH: 100,
} as const;

/**
 * Redis and database constants
 */
export const REDIS_CONSTANTS = {
  /** Maximum keys to reconcile in one batch */
  MAX_RECONCILE_KEYS: 1000,
  /** Batch size for Redis SCAN operations */
  SCAN_BATCH_SIZE: 100,
  /** Threshold for stale TTL (6 days in seconds, close to 7-day TTL) */
  STALE_TTL_THRESHOLD_SECONDS: 6 * 24 * 60 * 60,
  /** Threshold for near-expiration TTL (60 seconds) */
  NEAR_EXPIRATION_TTL_SECONDS: 60,
  /** Threshold for warning about high connection count */
  HIGH_CONNECTION_COUNT_THRESHOLD: 10,
} as const;

/**
 * Metrics and monitoring constants
 */
export const METRICS_CONSTANTS = {
  /** Metrics TTL in seconds (30 days) */
  METRIC_TTL_SECONDS: TIME_CONSTANTS.THIRTY_DAYS_SECONDS,
  /** Default pagination limit */
  DEFAULT_PAGINATION_LIMIT: 20,
} as const;

/**
 * Circuit breaker constants
 */
export const CIRCUIT_BREAKER_CONSTANTS = {
  /** Additional expiration time for circuit breaker keys (60 seconds) */
  KEY_EXPIRATION_BUFFER_SECONDS: 60,
} as const;

/**
 * Delay and retry constants
 */
export const RETRY_CONSTANTS = {
  /** Base delay for exponential backoff in milliseconds */
  BASE_DELAY_MS: 1000,
  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Phone number validation constants
 */
export const PHONE_CONSTANTS = {
  /** Length of US phone number (10 digits) */
  US_PHONE_LENGTH: 10,
} as const;

/**
 * Priority constants
 */
export const PRIORITY_CONSTANTS = {
  /** Minimum priority level */
  MIN_PRIORITY: 1,
  /** Maximum priority level */
  MAX_PRIORITY: 10,
  /** Critical event priority threshold */
  CRITICAL_PRIORITY_THRESHOLD: 8,
} as const;

