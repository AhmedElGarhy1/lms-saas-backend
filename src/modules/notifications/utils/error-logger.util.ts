import { LoggerService } from '@/shared/services/logger.service';

/**
 * Context interface for error logging
 */
export interface ErrorLogContext {
  userId?: string;
  correlationId?: string;
  jobId?: string;
  channel?: string;
  type?: string;
  [key: string]: any;
}

/**
 * Utility class for standardized error logging in notification system
 */
export class NotificationErrorLogger {
  /**
   * Log error with standardized format
   */
  static logError(
    logger: LoggerService,
    error: unknown,
    message: string,
    service: string,
    context: ErrorLogContext,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error(
      message,
      stack,
      service,
      {
        ...context,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Log warning with standardized format
   */
  static logWarning(
    logger: LoggerService,
    message: string,
    service: string,
    context: ErrorLogContext,
  ): void {
    logger.warn(
      message,
      service,
      {
        ...context,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Log debug message with standardized format
   */
  static logDebug(
    logger: LoggerService,
    message: string,
    service: string,
    context: ErrorLogContext,
  ): void {
    logger.debug(
      message,
      service,
      {
        ...context,
        timestamp: new Date().toISOString(),
      },
    );
  }
}

