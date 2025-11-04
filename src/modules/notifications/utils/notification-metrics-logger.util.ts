import { LoggerService } from '@/shared/services/logger.service';

/**
 * Standardized metrics structure for notification logging
 */
export interface NotificationMetrics {
  eventName: string;
  correlationId: string;
  recipientCount?: number;
  concurrencyLimit?: number;
  duration?: number;
  successCount?: number;
  failureCount?: number;
  centerId?: string;
  recipientId?: string;
  error?: string;
}

/**
 * Log notification processing start with standardized format
 * @param logger - LoggerService instance
 * @param metrics - Notification metrics to log
 */
export function logNotificationStart(
  logger: LoggerService,
  metrics: NotificationMetrics,
): void {
  logger.info(
    `Starting multi-recipient processing: ${metrics.recipientCount} recipients (concurrency limit: ${metrics.concurrencyLimit})`,
    'NotificationService',
    {
      eventName: metrics.eventName,
      correlationId: metrics.correlationId,
      recipientCount: metrics.recipientCount,
      concurrencyLimit: metrics.concurrencyLimit,
      centerId: metrics.centerId,
    },
  );
}

/**
 * Log notification processing completion with standardized format
 * @param logger - LoggerService instance
 * @param metrics - Notification metrics to log
 */
export function logNotificationComplete(
  logger: LoggerService,
  metrics: NotificationMetrics,
): void {
  logger.info(
    `Multi-recipient processing completed in ${metrics.duration}ms: ${metrics.successCount} succeeded, ${metrics.failureCount} failed`,
    'NotificationService',
    {
      eventName: metrics.eventName,
      correlationId: metrics.correlationId,
      duration: metrics.duration,
      successCount: metrics.successCount,
      failureCount: metrics.failureCount,
      recipientCount: metrics.recipientCount,
      concurrencyLimit: metrics.concurrencyLimit,
    },
  );
}

/**
 * Log per-recipient notification error with standardized format
 * @param logger - LoggerService instance
 * @param metrics - Notification metrics to log
 * @param error - Optional Error object for stack trace
 */
export function logNotificationError(
  logger: LoggerService,
  metrics: NotificationMetrics,
  error?: Error,
): void {
  logger.error(
    `Failed to process notification for recipient ${metrics.recipientId}`,
    error?.stack,
    'NotificationService',
    {
      eventName: metrics.eventName,
      correlationId: metrics.correlationId,
      recipientId: metrics.recipientId,
      error: metrics.error || error?.message,
    },
  );
}

