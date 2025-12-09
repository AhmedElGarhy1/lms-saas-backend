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
import { ControllerResponse } from '../dto/controller-response.dto';
import { TranslationMessage } from '../types/translation.types';

/**
 * Translation response interceptor
 *
 * Translates only response messages (ControllerResponse.message and error messages).
 * Data translation is handled by the frontend.
 *
 * Features:
 * - Translates TranslationMessage objects in response messages
 * - Translates error messages and details
 * - Handles nested translation keys in message arguments
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
        // For ControllerResponse instances, translate the message
        if (data instanceof ControllerResponse) {
          return {
            data: data.data, // Return data as-is, no translation
            message: this.translateMessage(data.message),
          };
        }

        // For ApiResponse objects (plain objects with success, data, message, meta)
        // These are created by ResponseInterceptor from ControllerResponse
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data &&
          this.isTranslationMessage((data as { message: unknown }).message)
        ) {
          const apiResponse = data as {
            success: boolean;
            data: unknown;
            message: TranslationMessage;
            meta?: unknown;
            [key: string]: unknown;
          };
          return {
            ...apiResponse,
            message: this.translateMessage(apiResponse.message),
          };
        }

        // For other responses, return as-is (no data translation)
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
          // Preserve the original stack trace by attaching it to the new exception
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
   * Check if value is a TranslationMessage object
   * Type guard for better type safety
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
   * Translate a TranslationMessage object
   *
   * @param translationMsg - Translation message object with key and optional args
   * @returns The translated string, or the key if translation fails
   */
  private translateMessage<P extends I18nPath>(
    translationMsg: TranslationMessage<P>,
  ): string {
    try {
      // Resolve nested translation keys in args
      const resolvedArgs =
        'args' in translationMsg && translationMsg.args
          ? this.resolveArgs(translationMsg.args)
          : undefined;

      // Translate the main message with resolved args
      const translated = this.translationService.translate(
        translationMsg.key,
        resolvedArgs as PathArgs<P>,
      );

      // Ensure we return a string
      return typeof translated === 'string' ? translated : translationMsg.key;
    } catch (error) {
      this.logger.warn(
        `Translation failed for key: ${translationMsg.key}`,
        error instanceof Error ? error.stack : String(error),
      );
      return translationMsg.key; // Fallback to key if translation fails
    }
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
          resolved[key] = this.translationService.translate(value as I18nPath);
        } catch {
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
        // Keep other values as-is (primitives)
        resolved[key] = value;
      }
    }

    return resolved;
  }
}
