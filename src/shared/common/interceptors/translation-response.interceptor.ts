import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TranslationService } from '@/shared/common/services/translation.service';
import { I18nPath } from '@/generated/i18n.generated';
import { PathArgs } from '@/generated/i18n-type-map.generated';
import { TranslationMessage } from '../types/translation.types';

/**
 * Translation response interceptor
 *
 * Translates response messages and error messages.
 * This interceptor runs after ResponseInterceptor, which converts ControllerResponse to ApiResponse.
 *
 * Features:
 * - Translates TranslationMessage objects in ApiResponse messages
 * - Translates error messages and details
 * - Handles nested translation keys in message arguments
 * - Translates bulk operation error messages
 */
@Injectable()
export class TranslationResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TranslationResponseInterceptor.name);

  constructor(private readonly translationService: TranslationService) {}

  /**
   * Intercept all responses and translate message translation keys
   *
   * @param context - NestJS execution context
   * @param next - Next handler in the chain
   * @returns Observable with translated response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Handle ApiResponse objects (created by ResponseInterceptor from ControllerResponse)
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data
        ) {
          const apiResponse = data as {
            success: boolean;
            data: unknown;
            message: string | TranslationMessage | undefined;
            meta?: unknown;
            [key: string]: unknown;
          };

          // Translate bulk operation error messages if present
          const translatedData = this.translateBulkOperationErrors(
            apiResponse.data,
          );

          // Translate the message
          const translatedMessage = this.translateApiResponseMessage(
            apiResponse.message,
          );

          return {
            ...apiResponse,
            data: translatedData,
            message: translatedMessage,
          };
        }

        // For other responses, return as-is
        return data;
      }),
      catchError((error: unknown) => {
        // Only log unexpected errors, not HttpExceptions (they're handled by GlobalExceptionFilter)
        if (!(error instanceof HttpException)) {
          if (error instanceof Error) {
            this.logger.error(
              `Unexpected error in TranslationResponseInterceptor: ${error.message}`,
              error.stack,
            );
          } else {
            this.logger.error(
              'Non-Error exception in TranslationResponseInterceptor',
              String(error),
            );
          }
        }

        // Translate error responses
        if (error instanceof HttpException) {
          const response = error.getResponse();
          const translated = this.translateErrorResponse(response);

          // Create a new HttpException with translated response
          const translatedException = new HttpException(
            translated as string | Record<string, unknown>,
            error.getStatus(),
          );

          // Preserve the original stack trace for debugging
          if (error.stack) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (translatedException as any).originalStack = error.stack;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (translatedException as any).originalError = error;
          }

          return throwError(() => translatedException);
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Translate ApiResponse message
   * Handles both TranslationMessage objects and translation key strings
   *
   * @param message - Message to translate (TranslationMessage object or string)
   * @returns Translated string message
   */
  private translateApiResponseMessage(
    message: string | TranslationMessage | undefined,
  ): string | undefined {
    if (!message) {
      return undefined;
    }

    // If it's a TranslationMessage object, translate it directly
    if (this.isTranslationMessage(message)) {
      return this.translateMessage(message);
    }

    // If it's a translation key string, translate it
    // This can happen if the TranslationMessage was serialized to just the key
    if (this.isTranslationKey(message)) {
      try {
        return this.translationService.translate(message as I18nPath);
      } catch (error) {
        this.logger.warn(
          `Failed to translate message key: ${message}`,
          error instanceof Error ? error.message : String(error),
        );
        return message; // Fallback to original
      }
    }

    // Not a translation, return as-is
    return message;
  }

  /**
   * Check if value is a TranslationMessage object
   *
   * @param value - Value to check
   * @returns true if value is a TranslationMessage object
   */
  private isTranslationMessage(value: unknown): value is TranslationMessage {
    return (
      typeof value === 'object' &&
      value !== null &&
      'key' in value &&
      typeof (value as TranslationMessage).key === 'string'
    );
  }

  /**
   * Check if a string is a translation key (starts with 't.')
   *
   * @param value - Value to check
   * @returns true if value is a translation key string
   */
  private isTranslationKey(value: unknown): boolean {
    return typeof value === 'string' && value.startsWith('t.');
  }

  /**
   * Translate error response (from GlobalExceptionFilter)
   *
   * @param response - Error response object with TranslationMessage objects
   * @returns Translated response with string messages
   */
  private translateErrorResponse(response: unknown): unknown {
    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const translated = { ...(response as Record<string, unknown>) };

      // Translate message (TranslationMessage object)
      if (this.isTranslationMessage(translated.message)) {
        translated.message = this.translateMessage(translated.message);
      }

      // Translate details
      if (Array.isArray(translated.details)) {
        translated.details = this.translateDetailsArray(
          translated.details as Array<{
            message?: unknown;
            [key: string]: unknown;
          }>,
        );
      }

      return translated;
    }

    return response;
  }

  /**
   * Translate details array (error details)
   */
  private translateDetailsArray(
    details: Array<{ message?: unknown; [key: string]: unknown }>,
  ): Array<{ message: string; [key: string]: unknown }> {
    return details.map((detail) => {
      const msg = detail.message;
      let message: string;

      if (this.isTranslationMessage(msg)) {
        message = this.translateMessage(msg);
      } else if (typeof msg === 'string') {
        message = msg;
      } else if (msg === null || msg === undefined) {
        message = '';
      } else if (typeof msg === 'object' && msg !== null) {
        // For objects, use JSON.stringify to avoid '[object Object]'
        try {
          message = JSON.stringify(msg);
        } catch {
          message = '[Unable to stringify object]';
        }
      } else {
        // For primitives (number, boolean, etc.), convert to string
        message = JSON.stringify(msg);
      }

      return {
        ...detail,
        message,
      };
    });
  }

  /**
   * Translate a TranslationMessage object
   *
   * @param translationMsg - Translation message object with key and optional args
   * @returns The translated string, or the key if translation fails
   */
  private translateMessage<P extends I18nPath>(
    translationMsg: TranslationMessage<P>,
  ): string {
    try {
      // Always recursively resolve all translation keys in args (deep recursive)
      const resolvedArgs =
        'args' in translationMsg && translationMsg.args
          ? this.resolveArgs(translationMsg.args)
          : undefined;

      // Translate the message with resolved args
      const translated = this.translationService.translate(
        translationMsg.key,
        resolvedArgs as PathArgs<P>,
      );

      // Ensure we return a string
      if (typeof translated !== 'string') {
        this.logger.warn(
          `Translation returned non-string for key: ${translationMsg.key}`,
          { translated, args: resolvedArgs },
        );
        return translationMsg.key;
      }

      return translated;
    } catch (error) {
      this.logger.error(
        `Translation failed for key: ${translationMsg.key}`,
        error instanceof Error ? error.stack : String(error),
        {
          args: 'args' in translationMsg ? translationMsg.args : undefined,
        },
      );
      return translationMsg.key; // Fallback to key if translation fails
    }
  }

  /**
   * Translate error messages in bulk operation results
   *
   * @param data - Response data that may contain bulk operation results
   * @returns Data with translated error messages and structured conflict details
   */
  private translateBulkOperationErrors(data: unknown): unknown {
    if (
      data &&
      typeof data === 'object' &&
      'type' in data &&
      (data as { type: unknown }).type === 'bulk-operation' &&
      'errors' in data &&
      Array.isArray((data as { errors: unknown }).errors)
    ) {
      const bulkResult = data as {
        type: 'bulk-operation';
        success: number;
        failed: number;
        total: number;
        errors?: Array<{
          id: string;
          code?: string;
          error: string;
          translationKey?: I18nPath;
          translationArgs?: Record<string, unknown>;
          details?: unknown;
          stack?: string;
        }>;
      };

      // Translate error messages that are translation keys
      if (bulkResult.errors && bulkResult.errors.length > 0) {
        const translatedErrors = bulkResult.errors.map((error) => {
          let translatedMessage: string;

          // Prefer translationKey if available (with args)
          if (error.translationKey) {
            try {
              const resolvedArgs = error.translationArgs
                ? this.resolveArgs(error.translationArgs as PathArgs<I18nPath>)
                : undefined;
              translatedMessage = this.translationService.translate(
                error.translationKey,
                resolvedArgs as PathArgs<I18nPath>,
              );
            } catch (err) {
              this.logger.warn(
                `Failed to translate bulk operation error: ${error.translationKey}`,
                err instanceof Error ? err.message : String(err),
              );
              // Fallback to error string or translation key
              translatedMessage = this.isTranslationKey(error.error)
                ? error.error
                : error.error;
            }
          } else if (this.isTranslationKey(error.error)) {
            // Fallback to error field if it's a translation key
            try {
              translatedMessage = this.translationService.translate(
                error.error as I18nPath,
              );
            } catch (err) {
              this.logger.warn(
                `Failed to translate bulk operation error: ${error.error}`,
                err instanceof Error ? err.message : String(err),
              );
              translatedMessage = error.error;
            }
          } else {
            // Use error message as-is if not a translation key
            translatedMessage = error.error;
          }

          // Return structured error matching DTO format
          return {
            id: error.id,
            code: error.code,
            message: translatedMessage,
            details: error.details,
            // Only include stack in development
            ...(process.env.NODE_ENV !== 'production' && error.stack
              ? { stack: error.stack }
              : {}),
          };
        });

        return {
          ...bulkResult,
          errors: translatedErrors,
        };
      }
    }

    return data;
  }

  /**
   * Recursively resolve nested translation keys in args
   * Translates any string starting with 't.' including in arrays
   *
   * @param args - Arguments object that may contain translation keys
   * @returns Resolved arguments with translation keys translated to strings
   */
  private resolveArgs(args: PathArgs<I18nPath>): Record<string, unknown> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return {};
    }

    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(args)) {
      if (this.isTranslationKey(value)) {
        // Translate nested translation key
        try {
          const translated = this.translationService.translate(
            value as I18nPath,
          );
          // Ensure we got a valid string translation
          if (typeof translated === 'string' && translated.length > 0) {
            resolved[key] = translated;
          } else {
            this.logger.warn(
              `Translation returned invalid value for nested key: ${String(value)}`,
              { translated },
            );
            resolved[key] = value; // Fallback to key if translation fails
          }
        } catch (error) {
          this.logger.warn(
            `Failed to translate nested key: ${String(value)}`,
            error instanceof Error ? error.message : String(error),
          );
          resolved[key] = value; // Fallback to key if translation fails
        }
      } else if (Array.isArray(value)) {
        // Process arrays that might contain translation keys
        resolved[key] = value.map((item: unknown) => {
          if (this.isTranslationKey(item)) {
            try {
              return this.translationService.translate(item as I18nPath);
            } catch {
              return item;
            }
          }
          // Recursively resolve if item is an object
          if (typeof item === 'object' && item !== null) {
            return this.resolveArgs(item as PathArgs<I18nPath>);
          }
          return item;
        });
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recursively resolve nested objects
        resolved[key] = this.resolveArgs(value as PathArgs<I18nPath>);
      } else {
        // Convert string numbers to actual numbers (nestjs-i18n pluralization requires numbers)
        // Only convert if string is purely numeric (no extra characters)
        if (typeof value === 'string' && /^-?\d+\.?\d*$/.test(value.trim())) {
          const num = Number(value);
          resolved[key] = !Number.isNaN(num) ? num : value;
        } else {
          resolved[key] = value;
        }
      }
    }

    return resolved;
  }
}
