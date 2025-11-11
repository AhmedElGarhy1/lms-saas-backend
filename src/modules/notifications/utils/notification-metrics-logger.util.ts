import { Logger } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * Standardized metrics structure for notification logging
 */
export interface NotificationMetrics {
  eventName: NotificationType;
  correlationId: string;
  recipientCount?: number;
  concurrencyLimit?: number;
  duration?: number;
  successCount?: number;
  failureCount?: number;
  centerId?: string;
  recipientId?: string;
  profileId?: string;
  profileType?: string;
  error?: string;
}

/**
 * Log notification processing start with standardized format
 * Only logs for large batches to avoid spam
 * @param logger - Logger instance
 * @param metrics - Notification metrics to log
 */
export function logNotificationStart(
  logger: Logger,
  metrics: NotificationMetrics,
): void {
  // Only log start for large batches (>10 recipients) to avoid log spam
  if ((metrics.recipientCount || 0) > 10) {
      logger.log(
      `Starting multi-recipient processing: ${metrics.recipientCount} recipients (concurrency limit: ${metrics.concurrencyLimit}) - ${JSON.stringify({ eventName: metrics.eventName, correlationId: metrics.correlationId, recipientCount: metrics.recipientCount, concurrencyLimit: metrics.concurrencyLimit, centerId: metrics.centerId })}`,
  );
  }
}

/**
 * Log notification processing completion with standardized format
 * Only logs if there were failures or for large batches to avoid spam
 * @param logger - Logger instance
 * @param metrics - Notification metrics to log
 */
export function logNotificationComplete(
  logger: Logger,
  metrics: NotificationMetrics,
): void {
  // Only log completion if there were failures or for large batches (>10 recipients)
  const hasFailures = (metrics.failureCount || 0) > 0;
  const isLargeBatch = (metrics.recipientCount || 0) > 10;
  
  if (hasFailures || isLargeBatch) {
      logger.log(
      `Multi-recipient processing completed in ${metrics.duration}ms: ${metrics.successCount} succeeded, ${metrics.failureCount} failed - ${JSON.stringify({ eventName: metrics.eventName, correlationId: metrics.correlationId, duration: metrics.duration, successCount: metrics.successCount, failureCount: metrics.failureCount, recipientCount: metrics.recipientCount, concurrencyLimit: metrics.concurrencyLimit })}`,
  );
  }
}

/**
 * Log per-recipient notification error with standardized format
 * Includes enhanced context with profile information for better debugging
 * @param logger - Logger instance
 * @param metrics - Notification metrics to log
 * @param error - Optional Error object for stack trace
 */
export function logNotificationError(
  logger: Logger,
  metrics: NotificationMetrics,
  error?: Error,
): void {
  const errorMessage = `Failed to process notification for recipient: userId=${metrics.recipientId}${metrics.profileId ? `, profileId=${metrics.profileId}` : ''}${metrics.profileType ? `, profileType=${metrics.profileType}` : ''}`;
  const context = {
    eventName: metrics.eventName,
    correlationId: metrics.correlationId,
    recipientId: metrics.recipientId,
    profileId: metrics.profileId,
    profileType: metrics.profileType,
    ...(metrics.error && !error && { error: metrics.error }),
  };
  logger.error(
    `${errorMessage} - ${JSON.stringify(context)}`,
    error instanceof Error ? error.stack : String(error),
  );
}
