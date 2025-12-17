import { Injectable, Logger, HttpException } from '@nestjs/common';
import pLimit from 'p-limit';
import { BaseService } from './base.service';
import {
  TranslatableException,
  ErrorDetail,
  EnhancedErrorResponse,
} from '../exceptions/custom.exceptions';
import { I18nPath } from '@/generated/i18n.generated';
import { PathArgs } from '@/generated/i18n-type-map.generated';
import { ErrorCode } from '../enums/error-codes.enum';

export interface BulkOperationOptions {
  concurrency?: number; // Default: 10, minimum: 1
  onProgress?: (processed: number, total: number) => void;
}

export interface BulkOperationError {
  id: string;
  code?: ErrorCode;
  error: string; // Translation key or error message
  translationKey?: I18nPath;
  translationArgs?: PathArgs<I18nPath>;
  details?: unknown; // Generic structured error details from ErrorDetail array
  stack?: string; // Only in development mode
}

export interface BulkOperationResult {
  type: 'bulk-operation';
  success: number;
  failed: number;
  total: number;
  errors?: BulkOperationError[];
}

@Injectable()
export class BulkOperationService extends BaseService {
  private readonly logger: Logger = new Logger(BulkOperationService.name);

  /**
   * Execute a bulk operation on an array of IDs
   * @param ids Array of IDs to process
   * @param operation Function that performs the operation on a single ID
   * @param options Optional configuration for concurrency control and progress tracking
   * @returns BulkOperationResult with success/failure counts and error details
   */
  async executeBulk<T = void>(
    ids: string[],
    operation: (id: string) => Promise<T>,
    options: BulkOperationOptions = {},
  ): Promise<BulkOperationResult> {
    // Validate and set concurrency (minimum 1)
    const concurrency = Math.max(1, options.concurrency || 10);
    const { onProgress } = options;

    // Validate input
    if (!ids || ids.length === 0) {
      return {
        type: 'bulk-operation',
        success: 0,
        failed: 0,
        total: 0,
        errors: [],
      };
    }

    // Deduplicate IDs to avoid redundant operations
    const uniqueIds = [...new Set(ids)];
    const total = uniqueIds.length;

    // Create concurrency limiter
    const limit = pLimit(concurrency);

    // Process all items with concurrency control
    const results = await Promise.allSettled(
      uniqueIds.map((id) =>
        limit(
          async (): Promise<
            { id: string; success: true } | BulkOperationError
          > => {
            try {
              await operation(id);
              return { id, success: true };
            } catch (error: unknown) {
              return this.extractErrorDetails(id, error);
            }
          },
        ),
      ),
    );

    // Count results from Promise.allSettled (no race condition)
    const result: BulkOperationResult = {
      type: 'bulk-operation',
      success: 0,
      failed: 0,
      total,
      errors: [],
    };

    results.forEach((settledResult, index) => {
      if (settledResult.status === 'fulfilled') {
        const value = settledResult.value;
        if ('success' in value && value.success) {
          result.success++;
        } else if ('error' in value) {
          // Value is BulkOperationError
          result.failed++;
          result.errors?.push(value);
        }
      } else {
        // Handle unexpected promise rejection (shouldn't happen, but defensive coding)
        result.failed++;
        const id = uniqueIds[index];
        const errorDetail = this.extractErrorDetails(id, settledResult.reason);
        result.errors?.push(errorDetail);
      }

      // Report progress after each item
      if (onProgress) {
        onProgress(index + 1, total);
      }
    });

    this.logger.log(
      `Bulk operation completed: ${result.success} succeeded, ${result.failed} failed out of ${result.total} total`,
    );

    // Remove errors array if empty for cleaner response
    if (result.errors && result.errors.length === 0) {
      delete result.errors;
    }

    return result;
  }

  /**
   * Extract structured error information from an exception
   * @param id - The ID that failed
   * @param error - The error that occurred
   * @returns BulkOperationError with structured information
   */
  private extractErrorDetails(id: string, error: unknown): BulkOperationError {
    const errorDetail: BulkOperationError = {
      id,
      error: 'Unknown error',
    };

    if (error instanceof Error) {
      // Check if it's a translatable exception with a translationKey
      const translatableError = error as unknown as TranslatableException;
      const httpException = error as unknown as HttpException;

      // Extract error code and details from HttpException response if available
      if (
        httpException.getResponse &&
        typeof httpException.getResponse === 'function'
      ) {
        const response = httpException.getResponse() as
          | EnhancedErrorResponse
          | string;
        if (typeof response === 'object' && 'code' in response) {
          if (response.code) {
            errorDetail.code = response.code;
          }
          // Extract details from response (where BaseTranslatableException stores them)
          if (response.details && Array.isArray(response.details)) {
            errorDetail.details = this.extractStructuredDetails(
              response.details,
            );
          }
        }
      }

      // Extract translation key and args if it's a translatable exception
      if (
        translatableError.translationKey &&
        typeof translatableError.translationKey === 'string'
      ) {
        errorDetail.translationKey = translatableError.translationKey;
        errorDetail.error = translatableError.translationKey; // Store key for translation
        errorDetail.translationArgs = translatableError.translationArgs;

        this.logger.warn(
          `Bulk operation failed for ID ${id}: ${translatableError.translationKey}`,
          translatableError.translationArgs || {},
        );
      } else {
        // Use the error message as-is for non-translatable errors
        errorDetail.error = error.message;
        this.logger.warn(
          `Bulk operation failed for ID ${id}: ${error.message}`,
        );
      }

      // Include stack trace only in development mode
      if (process.env.NODE_ENV !== 'production') {
        errorDetail.stack = error.stack;
      }
    } else {
      errorDetail.error = String(error);
      this.logger.warn(`Bulk operation failed for ID ${id}: ${String(error)}`);
    }

    return errorDetail;
  }

  /**
   * Extract generic error details from ErrorDetail array
   * Converts ErrorDetail array to a structured object for frontend consumption
   * @param details - Array of ErrorDetail objects
   * @returns Structured error details object
   */
  private extractStructuredDetails(details: ErrorDetail[]): unknown {
    if (!details || details.length === 0) {
      return undefined;
    }

    // Convert ErrorDetail array to a structured object
    // Each detail's value is preserved, allowing any module to provide structured data
    const structuredDetails: Record<string, unknown> = {};

    for (const detail of details) {
      if (detail.field && detail.value !== undefined) {
        // Use field as key, value as the structured data
        // This allows any module to provide any structure in the value
        structuredDetails[detail.field] = detail.value;
      }
    }

    // If only one detail, return its value directly for simpler structure
    // Otherwise return the structured object
    if (
      details.length === 1 &&
      details[0].field &&
      details[0].value !== undefined
    ) {
      return details[0].value;
    }

    return Object.keys(structuredDetails).length > 0
      ? structuredDetails
      : undefined;
  }
}
