import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StandardizedErrorResponse } from '../exceptions/error.types';
import {
  DomainException,
  SystemException,
} from '../exceptions/domain.exception';
import { AllErrorCodes, CommonErrorCode } from '../enums/error-codes';
import { AuthErrorCode } from '@/modules/auth/enums/auth.codes';
import { AccessControlErrorCode } from '@/modules/access-control/enums/access-control.codes';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { CommonErrors } from '../exceptions/common.errors';
import { SystemErrors } from '../exceptions/system.exception';
import {
  DATABASE_ERROR_CODES,
  isDatabaseErrorCode,
} from '../constants/database-errors.constants';

/**
 * Unified Global Exception Filter
 *
 * Handles all exception types in a single, comprehensive filter:
 * - TypeORM exceptions (QueryFailedError, EntityNotFoundError)
 * - Application exceptions (DomainException, SystemException)
 * - Unknown exceptions with fallback handling
 *
 * Converts database constraint violations (like unique constraints) to validation errors (400)
 * while treating other database/system errors as internal server errors (500).
 *
 * Ensures consistent error formatting and proper HTTP status codes across all contexts,
 * including transactional operations.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(GlobalExceptionFilter.name);

  /**
   * Main exception handler
   * @param exception - The exception that was thrown
   * @param host - NestJS execution context
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: StandardizedErrorResponse;

    // Handle TypeORM exceptions first (database-specific errors)
    if (exception instanceof QueryFailedError) {
      return this.handleQueryFailedError(exception, response);
    }

    if (exception instanceof EntityNotFoundError) {
      return this.handleEntityNotFoundError(exception, response);
    }

    // Handle application exceptions (DomainException, SystemException)
    if (
      exception instanceof DomainException ||
      exception instanceof SystemException
    ) {
      const exceptionResponse = exception.getResponse() as any;
      status = exception.getStatus();

      let details: any[] | undefined;
      if (
        exception instanceof DomainException &&
        exception.details &&
        exception.details.length > 0
      ) {
        details = exception.details;
      } else if (exception instanceof SystemException && exception.metadata) {
        details = [exception.metadata];
      }

      // Include debugging information in development mode
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const debugInfo = isDevelopment
        ? {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            requestId: (request as any).requestId,
            correlationId: (request as any).correlationId,
          }
        : undefined;

      const stackTrace =
        isDevelopment && exception instanceof Error
          ? this.formatStackTrace(exception.stack)
          : undefined;

      errorResponse = {
        success: false,
        error: {
          code: exceptionResponse.errorCode,
          ...(details && { details }),
          ...(stackTrace && { stack: stackTrace }),
          ...(debugInfo && { debug: debugInfo }),
        },
      };

      // Log detailed error information to console in development mode
      if (isDevelopment) {
        console.error('\n🚨 DEVELOPMENT ERROR DETAILS:');
        console.error('='.repeat(80));
        console.error(`❌ Code: ${exceptionResponse.errorCode}`);
        console.error(`📍 Path: ${request.method} ${request.url}`);
        if (exception.message) {
          console.error(`💬 Message: ${exception.message}`);
        }
        if (details && details.length > 0) {
          console.error('📋 Details:', JSON.stringify(details, null, 2));
        }
        if (stackTrace && stackTrace.length > 0) {
          console.error('🔍 Stack Trace:');
          stackTrace.forEach((line, index) => {
            console.error(`  ${index + 1}. ${line}`);
          });
        }
        console.error('='.repeat(80));
        console.error('');
      }

      // Log differently based on exception type
      if (exception instanceof DomainException) {
        this.logger.warn(`Domain error: ${exception.errorCode}`, {
          code: exception.errorCode,
          details: exception.details,
          path: request.url,
        });
      } else if (exception instanceof SystemException) {
        this.logger.error(`System error: ${exception.errorCode}`, {
          code: exception.errorCode,
          metadata: exception.metadata,
          path: request.url,
          stack: exception.stack,
        });
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();

      // Handle 304 Not Modified specially - don't send error response body
      if (status === HttpStatus.NOT_MODIFIED) {
        if (!response.headersSent && !response.finished) {
          // Just send the status code - 304 should have no body
          response.status(status).end();
        }
        return;
      }

      const exceptionResponse = exception.getResponse();

      // Include debugging information in development mode
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const debugInfo = isDevelopment
        ? {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            requestId: (request as any).requestId,
            correlationId: (request as any).correlationId,
          }
        : undefined;

      const stackTrace =
        isDevelopment && exception instanceof Error
          ? this.formatStackTrace(exception.stack)
          : undefined;

      // Convert all exceptions to standardized minimal format
      errorResponse = {
        success: false,
        error: {
          code: this.getGenericErrorCode(status),
          ...(stackTrace && { stack: stackTrace }),
          ...(debugInfo && { debug: debugInfo }),
        },
      };

      // Log detailed error information to console in development mode
      if (isDevelopment) {
        console.error('\n🚨 DEVELOPMENT ERROR DETAILS:');
        console.error('='.repeat(80));
        console.error(`❌ Code: ${this.getGenericErrorCode(status)}`);
        console.error(`📍 Path: ${request.method} ${request.url}`);
        console.error(`🔢 Status: ${status}`);
        if (exception.message) {
          console.error(`💬 Message: ${exception.message}`);
        }
        if (stackTrace && stackTrace.length > 0) {
          console.error('🔍 Stack Trace:');
          stackTrace.forEach((line, index) => {
            console.error(`  ${index + 1}. ${line}`);
          });
        }
        console.error('='.repeat(80));
        console.error('');
      }
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;

      // Include debugging information in development mode
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const debugInfo = isDevelopment
        ? {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            requestId: (request as any).requestId,
            correlationId: (request as any).correlationId,
          }
        : undefined;

      const stackTrace =
        isDevelopment && exception instanceof Error
          ? this.formatStackTrace(exception.stack)
          : undefined;

      errorResponse = {
        success: false,
        error: {
          code: CommonErrorCode.INTERNAL_SERVER_ERROR,
          ...(stackTrace && { stack: stackTrace }),
          ...(debugInfo && { debug: debugInfo }),
        },
      };

      // Log detailed error information to console in development mode
      if (isDevelopment) {
        console.error('\n🚨 DEVELOPMENT ERROR DETAILS (UNEXPECTED):');
        console.error('='.repeat(80));
        console.error(`❌ Code: ${CommonErrorCode.INTERNAL_SERVER_ERROR}`);
        console.error(`📍 Path: ${request.method} ${request.url}`);
        console.error(`🔢 Status: ${status}`);
        console.error(`💬 Type: Unexpected Error`);
        if (exception && typeof exception === 'object') {
          console.error(
            `🔍 Exception:`,
            exception.constructor?.name || 'Unknown',
          );
          if (exception instanceof Error && exception.message) {
            console.error(`💬 Message: ${exception.message}`);
          }
        }
        if (stackTrace && stackTrace.length > 0) {
          console.error('🔍 Stack Trace:');
          stackTrace.forEach((line, index) => {
            console.error(`  ${index + 1}. ${line}`);
          });
        }
        console.error('='.repeat(80));
        console.error('');
      }
    }

    // Send the standardized response
    // Check if response has already been sent (e.g., by ETagInterceptor with 304)
    if (!response.headersSent && !response.finished) {
      response.status(status).json(errorResponse);
    } else {
      // Response already sent, just log the error
      try {
        this.logger.error(
          `Cannot send error response: headers already sent. Error: ${JSON.stringify(errorResponse)}`,
        );
      } catch (loggerError) {
        // Emergency fallback for headers sent logging
        console.error('CRITICAL: Failed to log headers-sent error', {
          errorResponse: errorResponse?.toString?.() || 'undefined',
          loggerError: loggerError?.message,
        });
      }
    }
  }

  private getGenericErrorCode(status: number): AllErrorCodes {
    switch (status) {
      case 400:
        return CommonErrorCode.VALIDATION_FAILED;
      case 401:
        return AuthErrorCode.AUTHENTICATION_FAILED;
      case 403:
        return AccessControlErrorCode.MISSING_PERMISSION;
      case 404:
        return CommonErrorCode.RESOURCE_NOT_FOUND;
      case 429:
        return CommonErrorCode.TOO_MANY_ATTEMPTS;
      case 500:
        return CommonErrorCode.INTERNAL_SERVER_ERROR;
      default:
        return CommonErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Handle QueryFailedError exceptions (database errors)
   * Converts unique constraint violations to validation errors (400)
   * Other DB errors remain as system errors (500)
   */
  private handleQueryFailedError(
    exception: QueryFailedError,
    response: Response,
  ): void {
    interface PostgresDriverError {
      code?: string;
      errno?: number;
      name?: string;
      detail?: string;
      constraint?: string;
    }

    const drv = (exception.driverError as PostgresDriverError) || {};
    const code = drv.code || drv.errno || drv.name;

    this.logger.debug(
      `QueryFailedError: code=${code}, constraint=${drv.constraint}, message=${exception.message}`,
    );

    // Handle unique constraint violations as validation errors (400)
    if (isDatabaseErrorCode(code, DATABASE_ERROR_CODES.UNIQUE_VIOLATION)) {
      const detail = drv.detail || '';
      const constraintName = drv.constraint || '';

      let field = this.extractFieldFromConstraint(constraintName);
      if (!field) {
        const match = detail.match(/Key \((.+?)\)=\((.+?)\)/);
        field = match ? match[1] : 'field';
      }

      // Create validation error response
      const validationErrors = {
        [field]: [
          {
            constraint: 'isUnique',
          },
        ],
      };

      const errorResponse: StandardizedErrorResponse = {
        success: false,
        error: {
          code: CommonErrorCode.VALIDATION_FAILED,
          details: [
            {
              validationErrors,
            },
          ],
        },
      };

      response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
      return;
    }

    // Handle other database errors as system errors (500)
    if (isDatabaseErrorCode(code, DATABASE_ERROR_CODES.EXCLUSION_VIOLATION)) {
      const constraintName = drv.constraint || '';

      // Check if this is the session overlap constraint
      const isSessionOverlap = constraintName.includes(
        'groupId_timeRange_exclusion',
      );

      const errorResponse: StandardizedErrorResponse = {
        success: false,
        error: {
          code: CommonErrorCode.INTERNAL_SERVER_ERROR,
          details: [
            {
              operation: isSessionOverlap
                ? 'database_constraint_validation'
                : 'database_operation',
              error: isSessionOverlap
                ? 'exclusion_constraint_violation'
                : 'exclusion_violation',
              constraint: drv.constraint,
              component: 'database',
            },
          ],
        },
      };

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
      return;
    }

    if (isDatabaseErrorCode(code, DATABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION)) {
      const errorResponse: StandardizedErrorResponse = {
        success: false,
        error: {
          code: CommonErrorCode.INTERNAL_SERVER_ERROR,
          details: [
            {
              operation: 'database_operation',
              error: 'foreign_key_violation',
              constraint: drv.constraint,
              component: 'database',
            },
          ],
        },
      };

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
      return;
    }

    if (isDatabaseErrorCode(code, DATABASE_ERROR_CODES.DEADLOCK)) {
      const errorResponse: StandardizedErrorResponse = {
        success: false,
        error: {
          code: CommonErrorCode.SERVICE_UNAVAILABLE,
          details: [
            {
              operation: 'database_operation',
              error: 'deadlock_detected',
              component: 'database',
            },
          ],
        },
      };

      response.status(HttpStatus.SERVICE_UNAVAILABLE).json(errorResponse);
      return;
    }

    // Unknown database error
    const errorResponse: StandardizedErrorResponse = {
      success: false,
      error: {
        code: CommonErrorCode.INTERNAL_SERVER_ERROR,
        details: [
          {
            operation: 'database_operation',
            error: 'unknown_database_error',
            code: code,
            component: 'database',
          },
        ],
      },
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }

  /**
   * Handle EntityNotFoundError exceptions
   */
  private handleEntityNotFoundError(
    exception: EntityNotFoundError,
    response: Response,
  ): void {
    const errorResponse: StandardizedErrorResponse = {
      success: false,
      error: {
        code: CommonErrorCode.INTERNAL_SERVER_ERROR,
        details: [
          {
            operation: 'entity_not_found',
            component: 'database',
          },
        ],
      },
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }

  /**
   * Extract field name from database constraint name
   * @param constraintName - Database constraint name (e.g., "UQ_users_phone")
   * @returns Field name or null if not found
   */
  private extractFieldFromConstraint(constraintName: string): string | null {
    if (!constraintName) return null;
    const match = constraintName.match(/(?:UQ|IDX)_\w+_(.+)/);
    return match ? match[1] : null;
  }

  /**
   * Handle TranslationMessage objects (now just returns the key since translation system is removed)
   * @param translationMsg - Translation message object with key and optional args
   * @returns The key (translation system removed)
   */

  /**
   * Format stack trace for development mode responses
   */
  private formatStackTrace(stack: string | undefined): string[] | null {
    if (!stack) return null;

    // Split stack into lines and clean up
    const lines = stack
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Remove the first line (usually "Error: message") since we show message separately
    if (lines.length > 0 && lines[0].startsWith('Error:')) {
      lines.shift();
    }

    return lines;
  }
}
