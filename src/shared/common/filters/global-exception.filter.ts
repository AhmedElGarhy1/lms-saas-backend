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
import { formatRemainingTime } from '@/modules/rate-limit/utils/rate-limit-time-formatter';
import { TranslationService } from '@/shared/services/translation.service';
import { TranslatableException } from '../exceptions/custom.exceptions';

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

      // Check if exception has translationKey property (custom exceptions)
      const translatableException = exception as TranslatableException;
      const hasTranslationKey =
        translatableException.translationKey !== undefined;

      // If it's already our custom exception format, use it
      if (
        typeof exceptionResponse === 'object' &&
        'code' in exceptionResponse &&
        'message' in exceptionResponse
      ) {
        errorResponse = exceptionResponse as EnhancedErrorResponse;

        // If exception has translationKey, translate the message
        if (hasTranslationKey && translatableException.translationKey) {
          errorResponse.message = TranslationService.translate(
            translatableException.translationKey,
            translatableException.translationArgs,
          );
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
        : (exceptionResponse as { message?: string })?.message ||
          'An error occurred';

    // Extract retryAfter from rate limit exception (if present)
    // Rate limit guard already provides retryAfter in the exception response
    let retryAfter: number | undefined;
    if (
      status === HttpStatus.TOO_MANY_REQUESTS &&
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      retryAfter = (exceptionResponse as { retryAfter?: number })?.retryAfter;
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
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };
  }

  private translateMessage(
    rawMessage: string,
    status: number,
    request: Request,
    retryAfter?: number,
  ): string {
    // Handle rate limit with retry after (special case)
    if (status === HttpStatus.TOO_MANY_REQUESTS && retryAfter) {
      const remainingTime = formatRemainingTime(retryAfter);
      return TranslationService.translate('t.errors.tooManyRequestsWithTime', {
        time: remainingTime,
      });
    }

    // If message starts with 't.', it's a translation key - translate it
    if (typeof rawMessage === 'string' && rawMessage.startsWith('t.')) {
      return TranslationService.translate(rawMessage as I18nPath);
    }

    // Try to translate using I18nService (backward compatibility)
    try {
      return this.i18n.translate(rawMessage as I18nPath);
    } catch {
      // If translation fails, return original message
      return rawMessage;
    }
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
