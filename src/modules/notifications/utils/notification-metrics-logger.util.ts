import { LoggerService } from '@/shared/services/logger.service';
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
 * @param logger - LoggerService instance
 * @param metrics - Notification metrics to log
 */
export function logNotificationStart(
  logger: LoggerService,
  metrics: NotificationMetrics,
): void {
  // Only log start for large batches (>10 recipients) to avoid log spam
  if ((metrics.recipientCount || 0) > 10) {
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
}

/**
 * Log notification processing completion with standardized format
 * Only logs if there were failures or for large batches to avoid spam
 * @param logger - LoggerService instance
 * @param metrics - Notification metrics to log
 */
export function logNotificationComplete(
  logger: LoggerService,
  metrics: NotificationMetrics,
): void {
  // Only log completion if there were failures or for large batches (>10 recipients)
  const hasFailures = (metrics.failureCount || 0) > 0;
  const isLargeBatch = (metrics.recipientCount || 0) > 10;
  
  if (hasFailures || isLargeBatch) {
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
}

/**
 * Log per-recipient notification error with standardized format
 * Includes enhanced context with profile information for better debugging
 * @param logger - LoggerService instance
 * @param metrics - Notification metrics to log
 * @param error - Optional Error object for stack trace
 */
export function logNotificationError(
  logger: LoggerService,
  metrics: NotificationMetrics,
  error?: Error,
): void {
  const errorMessage = `Failed to process notification for recipient: userId=${metrics.recipientId}${metrics.profileId ? `, profileId=${metrics.profileId}` : ''}${metrics.profileType ? `, profileType=${metrics.profileType}` : ''}`;
  if (error) {
    logger.error(errorMessage, error, 'NotificationService', {
      eventName: metrics.eventName,
      correlationId: metrics.correlationId,
      recipientId: metrics.recipientId,
      profileId: metrics.profileId,
      profileType: metrics.profileType,
    });
  } else {
    logger.error(errorMessage, 'NotificationService', {
      eventName: metrics.eventName,
      correlationId: metrics.correlationId,
      recipientId: metrics.recipientId,
      profileId: metrics.profileId,
      profileType: metrics.profileType,
      error: metrics.error,
    });
  }
}
