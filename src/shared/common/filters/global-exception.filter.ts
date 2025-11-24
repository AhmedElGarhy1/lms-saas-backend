import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EnhancedErrorResponse } from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations, I18nPath } from '@/generated/i18n.generated';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: EnhancedErrorResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // If it's already our custom exception format, use it as-is (already translated)
      if (
        typeof exceptionResponse === 'object' &&
        'code' in exceptionResponse &&
        'message' in exceptionResponse
      ) {
        errorResponse = exceptionResponse as EnhancedErrorResponse;
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

    // Log the error
    this.logError(exception, request, errorResponse);

    // Send the standardized response
    response.status(status).json(errorResponse);
  }

  private convertToStandardFormat(
    status: number,
    exceptionResponse: string | object,
    request: Request,
  ): EnhancedErrorResponse {
    const rawMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || 'An error occurred';

    // Extract retryAfter for rate limit errors
    // Calculate dynamically from resetTime if available (most accurate)
    // RateLimitGuard always passes resetTime, so this should always work
    let retryAfter: number | undefined;
    if (
      status === HttpStatus.TOO_MANY_REQUESTS &&
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const response = exceptionResponse as any;

      // Calculate dynamically from resetTime if available (most accurate)
      if (response.resetTime) {
        const now = Date.now();
        const remainingMs = response.resetTime - now;
        retryAfter = Math.max(1, Math.round(remainingMs / 1000));
      } else if (response.retryAfter) {
        // Fallback to static retryAfter
        retryAfter = response.retryAfter;
      }
      // If neither is available, retryAfter remains undefined and will use fallback message
    }

    // Translate the message for user-facing response
    const message = this.translateMessage(
      rawMessage,
      status,
      request,
      retryAfter,
    );

    return {
      statusCode: status,
      message,
      error: this.getErrorType(status),
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
    if (exception instanceof Error) {
      this.logger.error('Internal server error', exception.stack);
    }
    const message = this.translateMessage(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
      request,
    );

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      error: 'Internal Server Error',
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };
  }

  /**
   * Format exact remaining time for rate limit
   * Returns format like "30 seconds", "1 minute 30 seconds", "2 minutes 15 seconds"
   * Always shows seconds when less than a minute, or minutes + seconds when more
   */
  private formatExactRemainingTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }

    const minutesStr = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    const secondsStr = `${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`;
    return `${minutesStr} ${secondsStr}`;
  }

  private translateMessage(
    rawMessage: string,
    status: number,
    request: Request,
    retryAfter?: number,
  ): string {
    try {
      // Handle rate limit with retry after
      if (status === HttpStatus.TOO_MANY_REQUESTS && retryAfter) {
        const remainingTime = this.formatExactRemainingTime(retryAfter);
        return this.i18n.translate('t.errors.tooManyRequestsWithTime', {
          args: { time: remainingTime },
        });
      }

      // Map by status code only (no message mapping needed)
      const statusKeyMap: Record<number, string> = {
        [HttpStatus.BAD_REQUEST]: 'errors.badRequest',
        [HttpStatus.UNAUTHORIZED]: 'errors.unauthorized',
        [HttpStatus.FORBIDDEN]: 'errors.forbidden',
        [HttpStatus.NOT_FOUND]: 'errors.notFound',
        [HttpStatus.CONFLICT]: 'errors.conflict',
        [HttpStatus.UNPROCESSABLE_ENTITY]: 'errors.unprocessableEntity',
        [HttpStatus.TOO_MANY_REQUESTS]: 'errors.tooManyRequests',
        [HttpStatus.INTERNAL_SERVER_ERROR]: 'errors.internalServerError',
        [HttpStatus.SERVICE_UNAVAILABLE]: 'errors.serviceUnavailable',
      };

      const statusKey = statusKeyMap[status];
      if (statusKey) {
        return this.i18n.translate(statusKey as I18nPath);
      }

      // Fallback to generic error
      return this.i18n.translate('t.errors.genericError');
    } catch (error) {
      // If translation fails, return original message (shouldn't happen)
      this.logger.warn('Translation failed, using original message', error);
      return rawMessage;
    }
  }

  private getErrorType(status: number): string {
    const errorTypes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    };

    return errorTypes[status] || 'Error';
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

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: EnhancedErrorResponse,
  ): void {
    const errorContext = {
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      statusCode: errorResponse.statusCode,
      message: errorResponse.message,
    };

    if (exception instanceof HttpException) {
      this.logger.warn(
        `HTTP Exception occurred - ${JSON.stringify(errorContext)}`,
      );
    } else {
      if (exception instanceof Error) {
        this.logger.error(
          `Unexpected error occurred - ${JSON.stringify(errorContext)}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      } else {
        this.logger.error(
          `Unexpected error occurred - ${JSON.stringify({ ...errorContext, error: String(exception) })}`,
        );
      }
    }
  }
}
