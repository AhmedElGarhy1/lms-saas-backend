import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IRequest } from '../interfaces/request.interface';
import {
  EnhancedErrorResponse,
  ErrorDetail,
} from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';
import { formatRemainingTime } from '@/modules/rate-limit/utils/rate-limit-time-formatter';
import { ERROR_MESSAGES } from '../constants/database-errors.constants';
import { EnterpriseLoggerService } from '../services/enterprise-logger.service';
import { RequestContextService } from '../services/request-context.service';

/**
 * Global exception filter
 * Catches all exceptions and converts them to standardized format
 * Handles error responses with translation keys
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    @Optional()
    @Inject(EnterpriseLoggerService)
    private readonly enterpriseLogger?: EnterpriseLoggerService,
    @Optional()
    @Inject(RequestContextService)
    private readonly requestContext?: RequestContextService,
  ) {}

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
    let errorResponse: EnhancedErrorResponse;

    if (exception instanceof HttpException) {
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

      // If it's already our custom exception format, use it
      if (
        typeof exceptionResponse === 'object' &&
        'code' in exceptionResponse &&
        'message' in exceptionResponse
      ) {
        errorResponse = exceptionResponse as EnhancedErrorResponse;

        // Ensure message is a string
        if (typeof errorResponse.message !== 'string') {
          errorResponse.message = 'An error occurred';
        }
      } else {
        // Convert standard NestJS exceptions to our format
        errorResponse = this.convertToStandardFormat(
          status,
          exceptionResponse,
          request,
        );
      }
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = this.createInternalServerErrorResponse(
        request,
        exception,
      );
    }

    // Add request metadata
    errorResponse.path = request.url;
    errorResponse.method = request.method;
    errorResponse.timestamp = new Date().toISOString();

    // Log the error using enterprise logger if available, fallback to standard logging
    if (this.enterpriseLogger && this.requestContext) {
      this.logErrorEnterprise(exception, request, errorResponse);
    } else {
      this.logError(exception, request, errorResponse);
    }

    // Send the error response
    if (Array.isArray(errorResponse.details)) {
      errorResponse.details = errorResponse.details.map(
        (detail: ErrorDetail) => {
          if (
            typeof detail.message === 'object' &&
            detail.message !== null &&
            'key' in detail.message
          ) {
            // Use plain string message directly
            return {
              field: detail.field,
              value: detail.value,
              message:
                typeof detail.message === 'string'
                  ? detail.message
                  : 'Validation error',
            };
          }
          // If already a string, keep it as-is
          return {
            field: detail.field,
            value: detail.value,
            message:
              typeof detail.message === 'string'
                ? detail.message
                : String(detail.message),
          };
        },
      );
    }

    // Send the standardized response (translated)
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

  private convertToStandardFormat(
    status: number,
    exceptionResponse: string | object,
    request: Request,
  ): EnhancedErrorResponse {
    const rawMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string })?.message ||
          'An error occurred';

    // Extract retryAfter from rate limit exception (if present)
    // Rate limit guard already provides retryAfter in the exception response
    let retryAfter: number | undefined;
    if (
      status === 429 && // HttpStatus.TOO_MANY_REQUESTS
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      retryAfter = (exceptionResponse as { retryAfter?: number })?.retryAfter;
    }

    // Generate plain English error message
    let message: string;
    if (status === 429 && retryAfter) {
      // Rate limit with retry after
      const remainingTime = formatRemainingTime(retryAfter);
      message = `Rate limit exceeded. Try again in ${remainingTime}`;
    } else if (typeof rawMessage === 'string' && rawMessage.startsWith('t.')) {
      // Translation key - convert to plain English
      message = rawMessage
        .replace('t.messages.', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase();
    } else {
      // Use raw message or generic error
      message =
        typeof rawMessage === 'string' ? rawMessage : 'An error occurred';
    }

    return {
      statusCode: status,
      message,
      code: this.getErrorCode(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };
  }

  private createInternalServerErrorResponse(
    request: Request,
    exception: unknown,
  ): EnhancedErrorResponse {
    // Log the exception for debugging (system log - stays in English)
    try {
      if (exception instanceof Error) {
        const message = exception.message || 'Unknown error';
        const stack = exception.stack || 'No stack trace available';
        this.logger.error(`Internal server error - ${message}`, stack);
      } else {
        // Handle cases where exception is undefined, null, or not an Error instance
        const errorMessage = exception
          ? String(exception)
          : 'Unknown error (exception is undefined/null)';
        this.logger.error('Internal server error', errorMessage);
      }
    } catch (loggerError) {
      // Fallback logging if the main logger fails
      console.error('Failed to log internal server error:', loggerError);
      console.error('Original exception:', exception);
    }
    // Use plain English error message
    const message = 'Internal server error';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };
  }

  private getErrorCode(status: number): ErrorCode {
    const errorCodes: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.UNPROCESSABLE_ENTITY,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
    };

    return errorCodes[status] || ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Enterprise-grade error logging with comprehensive context
   */
  private logErrorEnterprise(
    exception: unknown,
    request: Request,
    errorResponse: EnhancedErrorResponse,
  ): void {
    // Extract user from request if available
    const user = (request as IRequest).actor;

    // Use enterprise logger for comprehensive error logging
    this.enterpriseLogger!.logHttpException(
      exception,
      request,
      errorResponse.statusCode,
      user,
    );
  }

  /**
   * Legacy error logging method (kept for backward compatibility)
   */
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: EnhancedErrorResponse,
  ): void {
    try {
      let logMessage: string;

      // Use plain string message
      if (typeof errorResponse?.message === 'string') {
        logMessage = errorResponse.message;
      } else {
        // Fallback for unexpected message format
        logMessage = String(errorResponse?.message || 'Unknown error');
      }

      const errorContext = {
        method: request?.method || 'UNKNOWN',
        url: request?.url || 'UNKNOWN',
        userAgent: request?.get ? request.get('User-Agent') : 'UNKNOWN',
        ip: request?.ip || 'UNKNOWN',
        statusCode: errorResponse?.statusCode || 500,
        message: logMessage, // Use English translation for logging
      };

      if (exception instanceof HttpException) {
        // Check if there's an original error/stack preserved (accessing internal HttpException properties)
        const originalError = (exception as { originalError?: unknown })
          .originalError;
        const originalStack = (exception as { originalStack?: string })
          .originalStack;

        try {
          if (originalStack || originalError) {
            // Log with full stack trace if available
            this.logger.error(
              `HTTP Exception occurred - ${JSON.stringify(errorContext)}`,
              originalStack ||
                (originalError instanceof Error
                  ? originalError.stack
                  : String(originalError)),
            );
          } else if (exception instanceof Error && exception.stack) {
            // Log with exception's own stack trace
            this.logger.error(
              `HTTP Exception occurred - ${JSON.stringify(errorContext)}`,
              exception.stack,
            );
          } else {
            // Fallback to warn if no stack trace available
            this.logger.warn(
              `HTTP Exception occurred - ${JSON.stringify(errorContext)}`,
            );
          }
        } catch (loggerError) {
          // Emergency fallback for HttpException logging
          console.error('CRITICAL: Failed to log HttpException', {
            errorContext,
            exception: exception?.message || String(exception),
            loggerError: loggerError?.message,
          });
        }
      } else {
        try {
          if (exception instanceof Error) {
            this.logger.error(
              `Unexpected error occurred - ${JSON.stringify(errorContext)}`,
              exception.stack || String(exception),
            );
          } else {
            this.logger.error(
              `Unexpected error occurred - ${JSON.stringify({ ...errorContext, error: String(exception) })}`,
            );
          }
        } catch (loggerError) {
          // Emergency fallback for unexpected error logging
          console.error('CRITICAL: Failed to log unexpected error', {
            errorContext,
            exception: String(exception),
            loggerError: loggerError?.message,
          });
        }
      }
    } catch (criticalError) {
      // Ultimate fallback - prevents recursive error loop
      console.error(
        '🚨 CRITICAL: Exception filter logError method failed completely',
        {
          originalException: exception?.toString?.() || String(exception),
          errorResponse: errorResponse?.toString?.() || 'undefined',
          request: {
            method: request?.method,
            url: request?.url,
            ip: request?.ip,
          },
          criticalError: criticalError?.message || String(criticalError),
        },
      );
    }
  }

  /**
   * Handle TranslationMessage objects (now just returns the key since translation system is removed)
   * @param translationMsg - Translation message object with key and optional args
   * @returns The key (translation system removed)
   */
}
