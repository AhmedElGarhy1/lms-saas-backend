import { Logger } from '@nestjs/common';

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
    logger: Logger,
    error: unknown,
    message: string,
    service: string,
    context: ErrorLogContext,
  ): void {
    const contextStr = JSON.stringify({
      ...context,
      service,
      timestamp: new Date().toISOString(),
    });
    logger.error(
      `${message} - ${contextStr}`,
      error instanceof Error ? error.stack : String(error),
    );
  }

  /**
   * Log warning with standardized format
   */
  static logWarning(
    logger: Logger,
    message: string,
    service: string,
    context: ErrorLogContext,
  ): void {
    const contextStr = JSON.stringify({
      ...context,
      service,
      timestamp: new Date().toISOString(),
    });
    logger.warn(`${message} - ${contextStr}`);
  }

  /**
   * Log debug message with standardized format
   */
  static logDebug(
    logger: Logger,
    message: string,
    service: string,
    context: ErrorLogContext,
  ): void {
    const contextStr = JSON.stringify({
      ...context,
      service,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`${message} - ${contextStr}`);
  }
}
