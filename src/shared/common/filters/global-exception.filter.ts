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
import {
  EnhancedErrorResponse,
  TranslatableException,
  ErrorDetail,
} from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';
import { TranslationService } from '@/shared/common/services/translation.service';
import { I18nPath } from '@/generated/i18n.generated';
import { PathArgs } from '@/generated/i18n-type-map.generated';
import { formatRemainingTime } from '@/modules/rate-limit/utils/rate-limit-time-formatter';
import { Locale } from '@/shared/common/enums/locale.enum';
import { TranslationMessage } from '../types/translation.types';
import { TranslatedErrorResponse } from '../types/translated-response.types';
import { TRANSLATION_KEYS } from '../constants/database-errors.constants';
import { EnterpriseLoggerService } from '../services/enterprise-logger.service';
import { RequestContextService } from '../services/request-context.service';

/**
 * Global exception filter
 * Catches all exceptions and converts them to standardized format
 * Handles translation as fallback if TranslationResponseInterceptor didn't run
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    private readonly translationService: TranslationService,
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

      // Check if exception has translationKey property (custom exceptions)
      const translatableException =
        exception as unknown as TranslatableException;
      const hasTranslationKey =
        translatableException.translationKey !== undefined;

      // If it's already our custom exception format, use it
      if (
        typeof exceptionResponse === 'object' &&
        'code' in exceptionResponse &&
        'message' in exceptionResponse
      ) {
        errorResponse = exceptionResponse as EnhancedErrorResponse;

        // Check if message is already translated (string) - if so, use it as-is
        // TranslationResponseInterceptor should have translated it before this filter runs
        const isAlreadyTranslated = typeof errorResponse.message === 'string';

        // If message is already translated, use it as-is - don't overwrite
        // If message is a TranslationMessage object, it means the interceptor didn't translate it
        // In that case, we should NOT overwrite it - the interceptor should have handled it
        // Only set translation keys if message is missing entirely (edge case)
        if (
          !isAlreadyTranslated &&
          !errorResponse.message &&
          hasTranslationKey &&
          translatableException.translationKey
        ) {
          // Message is missing - set TranslationMessage object
          // Use type assertion since TypeScript can't narrow the conditional type here
          errorResponse.message = (
            translatableException.translationArgs
              ? {
                  key: translatableException.translationKey,
                  args: translatableException.translationArgs,
                }
              : {
                  key: translatableException.translationKey,
                }
          ) as TranslationMessage;
        }

        // Create error details for unique constraint violations if not already present
        // Only if details don't exist and exception has the necessary info
        if (
          hasTranslationKey &&
          translatableException.translationKey ===
            TRANSLATION_KEYS.ERRORS.DUPLICATE_FIELD &&
          translatableException.translationArgs &&
          (!errorResponse.details || errorResponse.details.length === 0)
        ) {
          // Extract field and value from args if they exist (runtime check)
          const args = translatableException.translationArgs as
            | Record<string, unknown>
            | undefined;
          const field = args?.field as string | undefined;
          const value: unknown = args?.value;

          // Extract field name from translation key if it's a key
          const fieldName =
            typeof field === 'string' && field.startsWith('t.')
              ? field.replace(
                  /^t\.(common\.(labels|resources)|resources)\./,
                  '',
                )
              : typeof field === 'string'
                ? field
                : 'field';

          errorResponse.details = [
            {
              field: fieldName,
              value: value || '',
              message:
                errorResponse.message ||
                ({
                  key: translatableException.translationKey,
                  args: translatableException.translationArgs,
                } as TranslationMessage),
            },
          ];
        }
        // If already translated (string), use it as-is (interceptor already translated it)
        // If message is a TranslationMessage object, keep it as-is (should have been translated by interceptor)
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

    // Translate TranslationMessage objects if they weren't translated by the interceptor
    // This is a fallback in case the interceptor didn't run or didn't translate
    if (
      typeof errorResponse.message === 'object' &&
      errorResponse.message !== null &&
      'key' in errorResponse.message
    ) {
      const translationMsg = errorResponse.message;
      const translatedMessage = this.translateMessage(translationMsg);
      // Convert to TranslatedErrorResponse type after translation
      const translatedResponse =
        errorResponse as unknown as TranslatedErrorResponse;
      translatedResponse.message = translatedMessage;
      errorResponse = translatedResponse as unknown as EnhancedErrorResponse;
    }

    // Translate details messages if they weren't translated
    if (Array.isArray(errorResponse.details)) {
      errorResponse.details = errorResponse.details.map(
        (detail: ErrorDetail) => {
          if (
            typeof detail.message === 'object' &&
            detail.message !== null &&
            'key' in detail.message
          ) {
            const translationMsg = detail.message;
            const translatedMessage = this.translateMessage(translationMsg);
            return {
              field: detail.field,
              value: detail.value,
              message: translatedMessage,
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
      ) as any; // Type assertion needed because details array type changes after translation
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

    // Store TranslationMessage object (translation happens in interceptor)
    // For rate limit, use translation key; for others, convert string to TranslationMessage
    let message: TranslationMessage;
    if (status === 429 && retryAfter) {
      // Rate limit with retry after - use translation key
      const remainingTime = formatRemainingTime(retryAfter);
      message = {
        key: 't.messages.rateLimitExceeded',
        args: { time: remainingTime },
      };
    } else if (typeof rawMessage === 'string' && rawMessage.startsWith('t.')) {
      // Already a translation key - use type assertion since key is dynamic
      // TypeScript cannot determine at compile time if this key requires args
      message = { key: rawMessage as I18nPath } as TranslationMessage;
    } else {
      // Not a translation key, convert to generic error message
      message = {
        key: 't.messages.errorWithMessage',
        args: { message: rawMessage },
      };
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
    // Store TranslationMessage object (translation happens in interceptor)
    // Use type assertion since TypeScript can't narrow conditional type with variable key
    const message: TranslationMessage = {
      key: TRANSLATION_KEYS.ERRORS.INTERNAL_SERVER_ERROR,
    } as TranslationMessage;

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
    const user = (request as any).actor;

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

      // Extract message key from TranslationMessage object
      if (
        typeof errorResponse?.message === 'object' &&
        errorResponse.message !== null &&
        'key' in errorResponse.message
      ) {
        const translationMsg = errorResponse.message;
        // If exception has translationKey, translate to English for logging
        if (exception instanceof HttpException) {
          const translatableException =
            exception as unknown as TranslatableException;
          if (translatableException.translationKey) {
            // this.translateForLogging() automatically resolves nested translation keys
            logMessage = this.translateForLogging(
              translatableException.translationKey,
              translatableException.translationArgs,
            );
          } else {
            logMessage = translationMsg.key;
          }
        } else {
          logMessage = translationMsg.key;
        }
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
        // Check if there's an original error/stack preserved
        const originalError = (exception as any).originalError;
        const originalStack = (exception as any).originalStack;

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
   * Translate a TranslationMessage object
   * @param translationMsg - Translation message object with key and optional args
   * @returns The translated string, or the key if translation fails
   */
  private translateMessage<P extends I18nPath>(
    translationMsg: TranslationMessage<P>,
  ): string {
    try {
      // Resolve nested translation keys in args (simple recursive translation)
      const resolvedArgs =
        'args' in translationMsg && translationMsg.args
          ? this.resolveArgs(translationMsg.args)
          : undefined;
      return this.translationService.translate(
        translationMsg.key,
        resolvedArgs as PathArgs<P>,
      );
    } catch (error) {
      try {
        this.logger.warn(
          `Translation failed for key: ${translationMsg.key}`,
          error,
        );
      } catch (loggerError) {
        // Emergency fallback for translation error logging
        console.error('CRITICAL: Failed to log translation error', {
          translationKey: translationMsg.key,
          originalError: error?.message,
          loggerError: loggerError?.message,
        });
      }
      return translationMsg.key; // Fallback to key if translation fails
    }
  }

  /**
   * Recursively resolve nested translation keys in args
   * Simple inline method - translates any string starting with 't.'
   * @param args - Arguments object that may contain translation keys
   * @returns Resolved arguments with translation keys translated to strings
   * Note: Returns Record<string, any> for runtime flexibility, but is type-safe at call sites
   */
  private resolveArgs(args: PathArgs<I18nPath>): Record<string, any> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return {};
    }

    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.startsWith('t.')) {
        // Translate nested translation key - simple and direct
        try {
          resolved[key] = this.translationService.translate(value as I18nPath);
        } catch {
          resolved[key] = value; // Fallback to key if translation fails
        }
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recursively resolve nested objects
        resolved[key] = this.resolveArgs(value);
      } else {
        // Keep other values as-is (primitives, arrays, etc.)
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Translate a key to English for logging purposes
   * Always uses 'en' locale regardless of request context
   * Automatically resolves nested translation keys in args
   * @param key Translation key
   * @param args Optional arguments (may contain nested translation keys)
   */
  private translateForLogging<P extends I18nPath>(
    key: P,
    args?: PathArgs<P>,
  ): string {
    try {
      // Resolve nested translation keys to English before translating
      const resolvedArgs = args ? this.resolveArgsForLogging(args) : undefined;
      return this.translationService.translateWithLocale(
        key,
        resolvedArgs as PathArgs<P>,
        Locale.EN,
      );
    } catch {
      // Fallback to key if translation fails
      return key;
    }
  }

  /**
   * Recursively resolve nested translation keys in args for logging (English only)
   * Simple inline method - translates any string starting with 't.' to English
   * @param args - Arguments object that may contain translation keys
   * @returns Resolved arguments with translation keys translated to English strings
   * Note: Returns Record<string, any> for runtime flexibility, but is type-safe at call sites
   */
  private resolveArgsForLogging(args: PathArgs<I18nPath>): Record<string, any> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return {};
    }

    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.startsWith('t.')) {
        // Translate nested translation keys to English - simple and direct
        try {
          resolved[key] = this.translationService.translateWithLocale(
            value as I18nPath,
            undefined,
            Locale.EN,
          );
        } catch {
          resolved[key] = value; // Fallback to key if translation fails
        }
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recursively resolve nested objects
        resolved[key] = this.resolveArgsForLogging(value);
      } else {
        // Keep other values as-is (primitives, arrays, etc.)
        resolved[key] = value;
      }
    }

    return resolved;
  }
}
