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
 * Single-point translation interceptor
 *
 * Translates all translation keys in responses at the response boundary.
 * Application code stores only keys; translation happens here.
 *
 * Features:
 * - Recursively translates all TranslationMessage objects
 * - Translates string fields starting with 't.'
 * - Handles nested translation keys in arguments
 * - Converts Date objects to ISO strings
 * - Includes depth limit to prevent stack overflow
 * - Handles circular references safely
 */
@Injectable()
export class TranslationResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TranslationResponseInterceptor.name);
  private readonly maxDepth = 10;

  constructor(private readonly translationService: TranslationService) {}

  /**
   * Intercept all responses and translate translation keys
   *
   * @param context - NestJS execution context
   * @param next - Next handler in the chain
   * @returns Observable with translated response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Translate success responses
        return this.translateResponse(data);
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
   * Recursively translate all translation keys in response
   *
   * @param data - Data to translate
   * @param depth - Current recursion depth (default: 0)
   * @param visited - Set of visited objects to detect circular references
   * @returns Translated data
   */
  private translateResponse(
    data: unknown,
    depth = 0,
    visited = new WeakSet<object>(),
  ): unknown {
    // Handle null/undefined
    if (data === null || data === undefined) {
      return data;
    }

    // Prevent stack overflow from deeply nested structures
    if (depth > this.maxDepth) {
      this.logger.warn(
        `Maximum translation depth (${this.maxDepth}) reached, returning original data`,
      );
      return data;
    }

    // Handle Date objects - convert to ISO string
    if (data instanceof Date) {
      return data.toISOString();
    }

    // Handle ControllerResponse instances
    if (data instanceof ControllerResponse) {
      return {
        data: this.translateResponse(data.data, depth + 1, visited),
        message: this.translateMessage(data.message),
      };
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) =>
        this.translateResponse(item, depth + 1, visited),
      );
    }

    // Handle objects
    if (typeof data === 'object') {
      // Detect circular references
      if (visited.has(data)) {
        this.logger.warn(
          'Circular reference detected in response data, skipping translation',
        );
        return '[Circular Reference]';
      }

      visited.add(data);
      const translated: Record<string, unknown> = {};

      try {
        for (const [key, value] of Object.entries(data)) {
          translated[key] = this.translateValue(value, key, depth, visited);
        }
      } finally {
        visited.delete(data);
      }

      return translated;
    }

    return data;
  }

  /**
   * Translate a single value
   */
  private translateValue(
    value: unknown,
    key: string,
    depth: number,
    visited: WeakSet<object>,
  ): unknown {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Translate TranslationMessage objects
    if (this.isTranslationMessage(value)) {
      return this.translateMessage(value);
    }

    // Translate string translation keys (start with 't.')
    if (typeof value === 'string' && value.startsWith('t.')) {
      return this.translateStringKey(value, key);
    }

    // Recursively translate arrays and objects
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.translateResponse(item, depth + 1, visited),
      );
    }

    if (typeof value === 'object' && value !== null) {
      return this.translateResponse(value, depth + 1, visited);
    }

    // Keep primitives as-is
    return value;
  }

  /**
   * Check if value is a TranslationMessage object
   */
  private isTranslationMessage(value: unknown): value is TranslationMessage {
    return (
      typeof value === 'object' &&
      value !== null &&
      'key' in value &&
      typeof (value as { key: unknown }).key === 'string'
    );
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
        // TypeScript knows msg is not object/string/null/undefined here
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
      // Resolve nested translation keys in args (simple recursive translation)
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
      if (typeof value === 'string' && value.startsWith('t.')) {
        // Translate nested translation key
        try {
          resolved[key] = this.translationService.translate(value as I18nPath);
        } catch {
          resolved[key] = value; // Fallback to key if translation fails
        }
      } else if (Array.isArray(value)) {
        // Recursively process arrays that might contain translation keys
        resolved[key] = value.map((item: unknown) => {
          if (typeof item === 'string' && item.startsWith('t.')) {
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

  /**
   * Translate a string translation key
   *
   * @param key - Translation key string
   * @param fieldName - Optional field name for better error messages
   * @returns The translated string, or the key if translation fails
   */
  private translateStringKey(key: string, fieldName?: string): string {
    try {
      return this.translationService.translate(key as I18nPath);
    } catch (error) {
      const context = fieldName ? ` in field: ${fieldName}` : '';
      this.logger.warn(
        `Translation failed for key: ${key}${context}`,
        error instanceof Error ? error.stack : String(error),
      );
      return key; // Fallback to key if translation fails
    }
  }
}
