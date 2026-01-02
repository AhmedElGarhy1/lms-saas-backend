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

/**
 * Global exception filter
 * Catches all exceptions and converts them to standardized format
 * Handles error responses with translation keys
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

    // Handle DomainException and SystemException first
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
