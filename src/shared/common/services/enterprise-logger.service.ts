import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import type { Request, Response } from 'express';
import { IRequest } from '../interfaces/request.interface';
import { RequestContextService } from './request-context.service';
import { ActorUser } from '../types/actor-user.type';

/**
 * Enterprise-grade logging service with structured logging,
 * correlation IDs, and contextual information
 */
@Injectable()
export class EnterpriseLoggerService extends Logger {
  constructor(
    @Optional()
    @Inject(RequestContextService)
    private readonly requestContext?: RequestContextService,
  ) {
    super('EnterpriseLogger');
  }

  /**
   * Log HTTP request start
   */
  logRequestStart(request: Request, user?: ActorUser): void {
    const context =
      this.requestContext?.getLoggingContextWithUser(user) ||
      this.buildFallbackContext(request, user);
    this.log(`HTTP Request Started: ${request.method} ${request.url}`, {
      ...context,
      type: 'request_start',
      userAgent: request.get('User-Agent'),
      ip: this.getClientIP(request),
    });
  }

  /**
   * Log HTTP request completion
   */
  logRequestComplete(
    request: Request,
    response: Response,
    user?: ActorUser,
  ): void {
    const duration = this.requestContext?.getDuration() || 0;
    const context =
      this.requestContext?.getLoggingContextWithUser(user) ||
      this.buildFallbackContext(request, user);
    const level = response.statusCode >= 400 ? 'warn' : 'log';

    this[level](
      `HTTP Request Completed: ${request.method} ${request.url} -> ${response.statusCode}`,
      {
        ...context,
        type: 'request_complete',
        statusCode: response.statusCode,
        duration,
        userAgent: request.get('User-Agent'),
        ip: this.getClientIP(request),
        performance: {
          duration,
          slow: duration > 1000, // Flag slow requests
        },
      },
    );
  }

  /**
   * Log business operation
   */
  logBusinessOperation(
    operation: string,
    data: Record<string, any>,
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose' = 'log',
  ): void {
    const context = this.requestContext?.getLoggingContext() || {};
    this[level](`Business Operation: ${operation}`, {
      ...context,
      type: 'business_operation',
      operation,
      ...data,
    });
  }

  /**
   * Log validation error with detailed context
   */
  logValidationError(request: Request, errors: any[], user?: ActorUser): void {
    const context =
      this.requestContext?.getLoggingContextWithUser(user) ||
      this.buildFallbackContext(request, user);
    this.warn('Validation Failed', {
      ...context,
      type: 'validation_error',
      errorCount: errors.length,
      errors: errors.map((error) => ({
        field: error.field,
        value: error.value,
        constraint: error.message?.key || error.message,
        args: error.message?.args,
      })),
      requestBody: this.sanitizeRequestBody(request.body),
      queryParams: request.query,
      url: request.url,
      method: request.method,
    });
  }

  /**
   * Log HTTP exception with full context
   */
  logHttpException(
    exception: any,
    request: Request,
    statusCode: number,
    user?: ActorUser,
  ): void {
    const context =
      this.requestContext?.getLoggingContextWithUser(user) ||
      this.buildFallbackContext(request, user);

    // Extract comprehensive error information
    const errorDetails = this.extractErrorDetails(exception);

    const errorContext = {
      ...context,
      type: 'http_exception',
      statusCode,
      exception: errorDetails,
      requestBody: this.sanitizeRequestBody(request.body),
      queryParams: request.query,
      headers: this.sanitizeHeaders(request.headers),
      stackTrace: this.formatStackTrace(exception?.stack),
      errorChain: this.extractErrorChain(exception),
      debugging: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    };

    // Log at appropriate level based on status code with enhanced context
    const logMessage = `HTTP Exception (${statusCode}): ${exception?.message || 'Unknown error'}`;

    if (statusCode >= 500) {
      this.error(logMessage, errorContext);
    } else if (statusCode >= 400) {
      this.warn(logMessage, errorContext);
    } else {
      this.log(logMessage, errorContext);
    }
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: any,
  ): void {
    const context = this.requestContext?.getLoggingContext() || {};
    const logData = {
      ...context,
      type: 'database_operation',
      operation,
      table,
      duration,
      success,
    };

    if (error) {
      this.error(`Database Error: ${operation} on ${table}`, {
        ...logData,
        error: error.message,
      });
    } else if (duration > 100) {
      this.warn(`Slow Database Query: ${operation} on ${table}`, logData);
    } else {
      this.debug(`Database Operation: ${operation} on ${table}`, logData);
    }
  }

  /**
   * Log external API call
   */
  logExternalApiCall(
    service: string,
    method: string,
    url: string,
    duration: number,
    statusCode?: number,
    error?: any,
  ): void {
    const context = this.requestContext?.getLoggingContext() || {};
    const logData = {
      ...context,
      type: 'external_api_call',
      service,
      method,
      url,
      duration,
      statusCode,
    };

    if (error) {
      this.error(`External API Error: ${service} ${method} ${url}`, {
        ...logData,
        error: error.message,
      });
    } else if (statusCode && statusCode >= 400) {
      this.warn(
        `External API Warning: ${service} ${method} ${url} -> ${statusCode}`,
        logData,
      );
    } else {
      this.debug(`External API Call: ${service} ${method} ${url}`, logData);
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    details: Record<string, any>,
    request: Request,
    user?: ActorUser,
  ): void {
    const context =
      this.requestContext?.getLoggingContextWithUser(user) ||
      this.buildFallbackContext(request, user);
    this.warn(`Security Event: ${event}`, {
      ...context,
      type: 'security_event',
      event,
      ...details,
      ip: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Build fallback context when RequestContextService is not available
   */
  private buildFallbackContext(
    request: Request,
    user?: ActorUser,
  ): Record<string, any> {
    const context: Record<string, any> = {
      requestId: (request as IRequest).id || 'unknown',
      correlationId: 'unknown',
      timestamp: new Date().toISOString(),
    };

    // Add user context
    if (user) {
      context.userId = user.id;
      context.userProfileId = user.userProfileId;
      context.userPhone = user.phone;
      context.userName = user.name;
      context.profileType = user.profileType;
    }

    return context;
  }

  /**
   * Get client IP address with proxy support
   */
  private getClientIP(request: Request): string {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      'unknown'
    );
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Limit size to prevent huge logs
    const serialized = JSON.stringify(sanitized);
    if (serialized.length > 1000) {
      return {
        ...sanitized,
        _truncated: true,
        _originalSize: serialized.length,
      };
    }

    return sanitized;
  }

  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Extract comprehensive error details for logging
   */
  private extractErrorDetails(exception: any): Record<string, any> {
    const details: Record<string, any> = {
      name: exception?.name || 'UnknownError',
      message: exception?.message || 'No message available',
      code: exception?.code,
      errno: exception?.errno,
      syscall: exception?.syscall,
    };

    // Add domain-specific error information
    if (exception?.errorCode) {
      details.errorCode = exception.errorCode;
      details.errorType = exception.constructor?.name;
    }

    // Add HTTP status if available
    if (exception?.status) {
      details.httpStatus = exception.status;
    }

    // Add additional properties that might be useful for debugging
    if (exception?.details && Array.isArray(exception.details)) {
      details.details = exception.details;
    }

    if (exception?.metadata) {
      details.metadata = exception.metadata;
    }

    return details;
  }

  /**
   * Format stack trace for better readability
   */
  private formatStackTrace(stack: string | undefined): string[] | null {
    if (!stack) return null;

    // Split stack into lines and clean up
    const lines = stack
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Remove the first line (usually "Error: message") since we log message separately
    if (lines.length > 0 && lines[0].startsWith('Error:')) {
      lines.shift();
    }

    return lines;
  }

  /**
   * Extract error chain (nested causes) for comprehensive debugging
   */
  private extractErrorChain(exception: any): any[] {
    const chain: any[] = [];
    let current = exception;

    // Walk through error causes (common patterns: .cause, .innerError, etc.)
    while (current && chain.length < 5) {
      // Limit to prevent infinite loops
      const cause =
        current.cause || current.innerError || current.originalError;
      if (!cause || chain.some((e) => e === cause)) break;

      chain.push({
        name: cause.name || 'UnknownError',
        message: cause.message || 'No message',
        stack: cause.stack ? this.formatStackTrace(cause.stack) : null,
      });

      current = cause;
    }

    return chain;
  }
}
