import { Injectable, Logger, HttpException } from '@nestjs/common';
import pLimit from 'p-limit';
import { BaseService } from './base.service';
import { DomainException } from '../exceptions/domain.exception';
import {
  AccessControlErrorCode,
  AllErrorCodes,
  AuthErrorCode,
  CommonErrorCode,
} from '../enums/error-codes';

export interface BulkOperationOptions {
  concurrency?: number; // Default: 10, minimum: 1
  onProgress?: (processed: number, total: number) => void;
}

export interface BulkOperationError {
  id: string;
  code: AllErrorCodes;
  details?: unknown; // Generic structured error details
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
        } else if ('id' in value && 'code' in value) {
          // Value is BulkOperationError (has id and code)
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
      code: CommonErrorCode.INTERNAL_SERVER_ERROR, // Default fallback
    };

    if (error instanceof DomainException) {
      // Handle DomainException (new error system)
      errorDetail.code = error.errorCode;
      errorDetail.details = error.details;
    } else if (error instanceof Error) {
      // Extract error details from HttpException
      const httpException = error as unknown as HttpException;

      // Extract error code and details from HttpException response if available
      if (
        httpException.getResponse &&
        typeof httpException.getResponse === 'function'
      ) {
        const response = httpException.getResponse() as
          | { code?: AllErrorCodes; details?: unknown }
          | string;
        if (typeof response === 'object' && 'code' in response) {
          if (response.code) {
            errorDetail.code = response.code;
          }
          // Extract details from response
          if (response.details) {
            errorDetail.details = response.details;
          }
        }
      } else {
        // Fallback to generic error code based on HTTP status
        errorDetail.code = this.getErrorCodeFromHttpException(httpException);
      }

      // Include stack trace only in development mode
      if (process.env.NODE_ENV !== 'production') {
        errorDetail.stack = error.stack;
      }

      this.logger.warn(`Bulk operation failed for ID ${id}: ${error.message}`);
    } else {
      errorDetail.details = String(error);
      this.logger.warn(`Bulk operation failed for ID ${id}: ${String(error)}`);
    }

    return errorDetail;
  }

  private getErrorCodeFromHttpException(
    httpException: HttpException,
  ): AllErrorCodes {
    const status = httpException.getStatus();
    switch (status) {
      case 400:
        return CommonErrorCode.VALIDATION_FAILED;
      case 401:
        return AuthErrorCode.AUTHENTICATION_FAILED; // Authentication failed
      case 403:
        return AccessControlErrorCode.MISSING_PERMISSION; // Missing permission
      case 404:
        return CommonErrorCode.RESOURCE_NOT_FOUND;
      case 429:
        return CommonErrorCode.TOO_MANY_ATTEMPTS;
      default:
        return CommonErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Extract generic error details from ErrorDetail array
   * Converts ErrorDetail array to a structured object for frontend consumption
   * @param details - Array of ErrorDetail objects
   * @returns Structured error details object
   */
  private extractStructuredDetails(details: unknown): unknown {
    // DomainException.details is already in the correct format
    return details;
  }
}
