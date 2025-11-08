import { NotificationChannel } from '../enums/notification-channel.enum';

/**
 * Error Handling Strategy
 *
 * Defines how services should behave when errors occur:
 * - FAIL_OPEN: Allow operation to proceed despite errors (graceful degradation)
 * - FAIL_CLOSED: Reject operation on error (strict validation)
 */
export enum ErrorHandlingStrategy {
  /**
   * Fail-open: Allow operation to proceed despite errors
   * Used for non-critical services where graceful degradation is acceptable
   * Example: Cache failures shouldn't block notifications
   */
  FAIL_OPEN = 'FAIL_OPEN',

  /**
   * Fail-closed: Reject operation on error
   * Used for critical services where errors must be handled explicitly
   * Example: Notification sending failures must be logged and retried
   */
  FAIL_CLOSED = 'FAIL_CLOSED',
}

/**
 * Error Handling Configuration
 *
 * Documents which services use which error handling strategy.
 * This ensures consistent behavior across the notifications module.
 *
 * @example
 * ```typescript
 * // In a service method
 * try {
 *   await this.cacheService.get(key);
 * } catch (error) {
 *   if (ERROR_HANDLING_CONFIG.TEMPLATE_CACHE === ErrorHandlingStrategy.FAIL_OPEN) {
 *     // Load without cache
 *     return this.loadDirectly();
 *   } else {
 *     throw error; // Fail-closed
 *   }
 * }
 * ```
 */
export const ERROR_HANDLING_CONFIG = {
  /**
   * Notification Channels: FAIL_CLOSED
   * Notification sending failures must be handled explicitly:
   * - Errors are logged and tracked in notification_logs
   * - Failed notifications trigger retry mechanisms
   * - Metrics are updated to track failure rates
   */
  [NotificationChannel.EMAIL]: ErrorHandlingStrategy.FAIL_CLOSED,
  [NotificationChannel.SMS]: ErrorHandlingStrategy.FAIL_CLOSED,
  [NotificationChannel.WHATSAPP]: ErrorHandlingStrategy.FAIL_CLOSED,
  [NotificationChannel.IN_APP]: ErrorHandlingStrategy.FAIL_CLOSED,
  [NotificationChannel.PUSH]: ErrorHandlingStrategy.FAIL_CLOSED,

  /**
   * Template Cache: FAIL_OPEN
   * If Redis template cache fails, load templates directly from filesystem
   * Cache is a performance optimization, not a critical dependency
   */
  TEMPLATE_CACHE: ErrorHandlingStrategy.FAIL_OPEN,

  /**
   * Rate Limiting: FAIL_OPEN
   * If rate limiting service fails, allow requests to proceed
   * Prevents Redis failures from blocking all notifications
   * Rate limiting is a protection mechanism, not a hard requirement
   */
  RATE_LIMITING: ErrorHandlingStrategy.FAIL_OPEN,

  /**
   * Idempotency Cache: FAIL_OPEN
   * If idempotency check fails, allow notification to proceed
   * Prevents duplicate notifications from being completely blocked
   * Duplicate prevention is best-effort, not critical
   */
  IDEMPOTENCY: ErrorHandlingStrategy.FAIL_OPEN,

  /**
   * Metrics: FAIL_OPEN
   * Metrics failures should never block notifications
   * Metrics are for observability, not business logic
   */
  METRICS: ErrorHandlingStrategy.FAIL_OPEN,

  /**
   * Circuit Breaker: FAIL_OPEN (when circuit is open)
   * When circuit breaker is open, it fails-open to prevent cascading failures
   * However, individual channel failures are still tracked
   */
  CIRCUIT_BREAKER: ErrorHandlingStrategy.FAIL_OPEN,
} as const;

/**
 * Get error handling strategy for a notification channel
 * @param channel - Notification channel
 * @returns Error handling strategy for the channel
 */
export function getChannelErrorHandlingStrategy(
  channel: NotificationChannel,
): ErrorHandlingStrategy {
  return ERROR_HANDLING_CONFIG[channel] || ErrorHandlingStrategy.FAIL_CLOSED;
}

/**
 * Check if a service should fail-open on errors
 * @param service - Service identifier (channel or service name)
 * @returns true if service should fail-open, false if fail-closed
 */
export function shouldFailOpen(
  service: NotificationChannel | keyof typeof ERROR_HANDLING_CONFIG,
): boolean {
  const strategy =
    ERROR_HANDLING_CONFIG[service as keyof typeof ERROR_HANDLING_CONFIG];
  return strategy === ErrorHandlingStrategy.FAIL_OPEN;
}

