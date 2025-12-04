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
 */
@Injectable()
export class TranslationResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TranslationResponseInterceptor.name);

  constructor(private readonly translationService: TranslationService) {}

  /**
   * Intercept all responses and translate translation keys
   * @param context - NestJS execution context
   * @param next - Next handler in the chain
   * @returns Observable with translated response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Translate success responses
        return this.translateResponse(data);
      }),
      catchError((error) => {
        // Log the full error with stack trace for debugging
        if (error instanceof Error) {
          this.logger.error(
            `Error intercepted in TranslationResponseInterceptor: ${error.message}`,
            error.stack,
          );
        } else {
          this.logger.error(
            'Non-Error exception intercepted in TranslationResponseInterceptor',
            String(error),
          );
        }

        // Translate error responses
        if (error instanceof HttpException) {
          const response = error.getResponse();
          const translated = this.translateErrorResponse(response);

          // Create a new HttpException with translated response
          // Preserve the original stack trace by attaching it to the new exception
          const translatedException = new HttpException(
            translated,
            error.getStatus(),
          );

          // Preserve the original stack trace for debugging
          if (error.stack) {
            // Attach original stack to the new exception
            (translatedException as any).originalStack = error.stack;
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
   * @param data - Data to translate
   * @param depth - Current recursion depth (default: 0)
   * @param maxDepth - Maximum recursion depth (default: 10)
   */
  private translateResponse(data: any, depth = 0, maxDepth = 10): any {
    if (!data) return data;

    // Prevent stack overflow from deeply nested structures
    if (depth > maxDepth) {
      this.logger.warn(
        `Maximum translation depth (${maxDepth}) reached, returning original data`,
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
        data: this.translateResponse(data.data, depth + 1, maxDepth),
        message: this.translateMessage(data.message),
      };
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) =>
        this.translateResponse(item, depth + 1, maxDepth),
      );
    }

    // Handle objects
    if (typeof data === 'object') {
      const translated: any = {};

      for (const [key, value] of Object.entries(data)) {
        // Handle Date objects - convert to ISO string
        if (value instanceof Date) {
          translated[key] = value.toISOString();
        }
        // Translate message fields (TranslationMessage objects)
        else if (
          key === 'message' &&
          typeof value === 'object' &&
          value !== null &&
          'key' in value
        ) {
          const translationMsg = value as TranslationMessage;
          translated[key] = this.translateMessage(translationMsg);
        }
        // Translate string fields that are translation keys (start with 't.')
        else if (typeof value === 'string' && value.startsWith('t.')) {
          translated[key] = this.translateStringKey(value, key);
        }
        // Translate details array (error details)
        else if (key === 'details' && Array.isArray(value)) {
          translated[key] = value.map((detail: any) => ({
            ...detail,
            message:
              typeof detail.message === 'object' &&
              detail.message !== null &&
              'key' in detail.message
                ? this.translateMessage(detail.message as TranslationMessage)
                : detail.message,
          }));
        }
        // Handle arrays - recursively translate each item
        else if (Array.isArray(value)) {
          translated[key] = value.map((item) =>
            this.translateResponse(item, depth + 1, maxDepth),
          );
        }
        // Recursively translate nested objects (including nested data structures)
        else if (typeof value === 'object' && value !== null) {
          translated[key] = this.translateResponse(value, depth + 1, maxDepth);
        }
        // Keep primitives as-is
        else {
          translated[key] = value;
        }
      }

      return translated;
    }

    return data;
  }

  /**
   * Translate error response (from GlobalExceptionFilter)
   * @param response - Error response object with TranslationMessage objects
   * @returns Translated response with string messages
   */
  private translateErrorResponse(response: any): any {
    console.log('response', response);
    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const translated = { ...response };

      // Translate message (TranslationMessage object)
      if (
        translated.message &&
        typeof translated.message === 'object' &&
        translated.message !== null &&
        'key' in translated.message
      ) {
        translated.message = this.translateMessage(
          translated.message as TranslationMessage,
        );
      }

      // Translate details
      if (Array.isArray(translated.details)) {
        translated.details = translated.details.map((detail: any) => ({
          ...detail,
          message:
            typeof detail.message === 'object' &&
            detail.message !== null &&
            'key' in detail.message
              ? this.translateMessage(detail.message as TranslationMessage)
              : detail.message,
        }));
      }

      return translated;
    }

    return response;
  }

  /**
   * Translate a TranslationMessage object
   */
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
      const resolvedArgs = translationMsg.args
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
        error,
      );
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
   * Translate a string translation key
   * @param key - Translation key string
   * @param fieldName - Optional field name for better error messages
   * @returns The translated string, or the key if translation fails
   */
  private translateStringKey(key: string, fieldName?: string): string {
    try {
      return this.translationService.translate(key as I18nPath);
    } catch (error) {
      const context = fieldName ? ` in field: ${fieldName}` : '';
      this.logger.warn(`Translation failed for key: ${key}${context}`, error);
      return key; // Fallback to key if translation fails
    }
  }
}
