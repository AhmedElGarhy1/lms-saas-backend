import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RequestContext } from '../common/context/request.context';
import { LogMetadata, LogContext } from './logger.types';

/**
 * Enterprise LoggerService - Fault-tolerant, structured logging
 *
 * Principles:
 * - Never throws errors (logging should never break application flow)
 * - Automatic context injection (request ID, user ID, center ID)
 * - Structured metadata support
 * - Consistent API across all log levels
 */
@Injectable()
export class LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly winstonLogger: Logger,
  ) {}

  /**
   * Extract current request context metadata
   */
  private extractRequestContext(): Partial<LogMetadata> {
    try {
      const context = RequestContext.get();
      if (!context) return {};

      return {
        requestId: context.requestId,
        userId: context.userId,
        centerId: context.centerId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };
    } catch {
      // RequestContext might not be available (background jobs, etc.)
      return {};
    }
  }

  /**
   * Write log entry with automatic error handling and context enrichment
   */
  private writeLogEntry(
    level: string,
    message: string,
    context: string,
    metadata: LogMetadata = {},
  ): void {
    try {
      const requestContext = this.extractRequestContext();
      const enrichedMetadata: LogMetadata = {
        ...requestContext,
        service: context,
        ...metadata,
        timestamp: new Date().toISOString(),
      };

      // Remove undefined values to keep logs clean
      Object.keys(enrichedMetadata).forEach(
        (key) =>
          enrichedMetadata[key] === undefined && delete enrichedMetadata[key],
      );

      this.winstonLogger.log(level, message, enrichedMetadata);
    } catch (error) {
      // Last resort: use console if Winston fails
      // This should never happen, but we must be defensive
      try {
        console.error('[LoggerService] Failed to log:', {
          level,
          message,
          context,
          error: error instanceof Error ? error.message : String(error),
        });
      } catch {
        // Even console might fail in some environments - silently fail
        // Logging should never break the application
      }
    }
  }

  /**
   * Log error with Error object
   * @param message - Error message
   * @param error - Error object
   * @param context - Service/context name
   * @param metadata - Additional metadata (optional)
   */
  error(
    message: string,
    error: Error,
    context: string,
    metadata?: LogContext,
  ): void;
  /**
   * Log error with message only
   * @param message - Error message
   * @param context - Service/context name
   * @param metadata - Additional metadata (optional)
   */
  error(message: string, context: string, metadata?: LogContext): void;
  error(
    message: string,
    errorOrContext: Error | string,
    contextOrMetadata?: string | LogContext,
    metadata?: LogContext,
  ): void {
    if (errorOrContext instanceof Error) {
      // error(message, error, context, metadata)
      const context =
        typeof contextOrMetadata === 'string'
          ? contextOrMetadata
          : 'UnknownService';
      this.writeLogEntry('error', message, context, {
        ...(metadata || {}),
        error: errorOrContext.message,
        stack: errorOrContext.stack,
      });
    } else {
      // error(message, context, metadata)
      const context = errorOrContext;
      const meta =
        typeof contextOrMetadata === 'object' &&
        !Array.isArray(contextOrMetadata)
          ? contextOrMetadata
          : metadata || {};
      this.writeLogEntry('error', message, context, meta);
    }
  }

  /**
   * Log warning
   * @param message - Warning message
   * @param context - Service/context name
   * @param metadata - Additional metadata (optional)
   */
  warn(message: string, context: string, metadata?: LogContext): void {
    this.writeLogEntry('warn', message, context, metadata || {});
  }

  /**
   * Log info message
   * @param message - Info message
   * @param context - Service/context name
   * @param metadata - Additional metadata (optional)
   */
  info(message: string, context: string, metadata?: LogContext): void {
    this.writeLogEntry('info', message, context, metadata || {});
  }

  /**
   * Log debug message
   * @param message - Debug message
   * @param context - Service/context name
   * @param metadata - Additional metadata (optional)
   */
  debug(message: string, context: string, metadata?: LogContext): void {
    this.writeLogEntry('debug', message, context, metadata || {});
  }

  /**
   * Log verbose message
   * @param message - Verbose message
   * @param context - Service/context name
   * @param metadata - Additional metadata (optional)
   */
  verbose(message: string, context: string, metadata?: LogContext): void {
    this.writeLogEntry('verbose', message, context, metadata || {});
  }

  /**
   * Log message (defaults to info level)
   * @param message - Log message
   * @param context - Service/context name
   * @param metadata - Additional metadata (optional)
   */
  log(message: string, context: string, metadata?: LogContext): void {
    this.writeLogEntry('info', message, context, metadata || {});
  }
}
