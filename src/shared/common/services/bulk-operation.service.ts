import { Injectable, Logger } from '@nestjs/common';
import pLimit from 'p-limit';
import { BaseService } from './base.service';

export interface BulkOperationOptions {
  concurrency?: number; // Default: 10, minimum: 1
  onProgress?: (processed: number, total: number) => void;
}

export interface BulkOperationError {
  id: string;
  error: string;
  message?: string;
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
        limit(async () => {
          try {
            await operation(id);
            return { id, success: true };
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            this.logger.warn(
              `Bulk operation failed for ID ${id}: ${errorMessage}`,
            );

            return {
              id,
              success: false,
              error: errorMessage,
              stack:
                process.env.NODE_ENV !== 'production' && error instanceof Error
                  ? error.stack
                  : undefined,
            } as const;
          }
        }),
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
        if (value.success) {
          result.success++;
        } else {
          result.failed++;
          result.errors?.push({
            id: value.id,
            error: value.error || 'Unknown error',
            message: value.stack,
          });
        }
      } else {
        // Handle unexpected promise rejection (shouldn't happen, but defensive coding)
        result.failed++;
        const id = uniqueIds[index];
        const errorMessage =
          settledResult.reason instanceof Error
            ? settledResult.reason.message
            : String(settledResult.reason);
        result.errors?.push({
          id,
          error: errorMessage,
          message:
            process.env.NODE_ENV !== 'production' &&
            settledResult.reason instanceof Error
              ? settledResult.reason.stack
              : undefined,
        });
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
}
