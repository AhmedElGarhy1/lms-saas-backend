import { Injectable } from '@nestjs/common';
import { RecipientInfo } from '../types/recipient-info.interface';
import pLimit from 'p-limit';
import { NotificationConfig } from '../config/notification.config';

/**
 * Result of processing a single recipient
 */
export interface RecipientProcessResult<T> {
  recipient: RecipientInfo;
  result: T | Error;
  success: boolean;
}

/**
 * Pure service for processing multiple recipients with configurable concurrency control
 *
 * Features:
 * - Configurable concurrency limit via NotificationConfig
 * - Handles batching and concurrency
 * - Returns detailed results for each recipient
 * - Pure orchestration - delegates processing to callback
 * - No side effects - only coordinates execution
 */
@Injectable()
export class MultiRecipientProcessor {
  private readonly concurrencyLimit: ReturnType<typeof pLimit>;

  constructor() {
    // Get concurrency limit from config
    // Default to 10 if not configured
    const limit = NotificationConfig.concurrency?.maxRecipientsPerBatch || 10;
    this.concurrencyLimit = pLimit(limit);
  }

  /**
   * Get current concurrency limit (for monitoring/logging)
   */
  getConcurrencyLimit(): number {
    // p-limit doesn't expose limit directly, so we return the configured value
    return NotificationConfig.concurrency?.maxRecipientsPerBatch || 10;
  }

  /**
   * Process multiple recipients with concurrency control
   *
   * Pure orchestration function - delegates actual processing to the provided callback.
   * Handles concurrency, error handling, and result aggregation.
   *
   * @param recipients - Array of recipients to process
   * @param processor - Async function to process each recipient
   * @returns Array of results, one per recipient
   */
  async processRecipients<T>(
    recipients: RecipientInfo[],
    processor: (recipient: RecipientInfo) => Promise<T>,
  ): Promise<RecipientProcessResult<T>[]> {
    if (recipients.length === 0) {
      return [];
    }

    // Process all recipients with concurrency control
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        this.concurrencyLimit(() => processor(recipient)),
      ),
    );

    // Map results to our format
    return results.map((result, index) => {
      const recipient = recipients[index];
      if (result.status === 'fulfilled') {
        return {
          recipient,
          result: result.value,
          success: true,
        };
      } else {
        return {
          recipient,
          result:
            result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason)),
          success: false,
        };
      }
    });
  }

  /**
   * Process recipients in batches
   *
   * Useful for very large recipient lists where you want to process
   * in smaller chunks to avoid memory issues.
   *
   * @param recipients - Array of recipients to process
   * @param processor - Async function to process each recipient
   * @param batchSize - Number of recipients per batch (default: 100)
   * @returns Array of results, one per recipient
   */
  async processRecipientsInBatches<T>(
    recipients: RecipientInfo[],
    processor: (recipient: RecipientInfo) => Promise<T>,
    batchSize: number = 100,
  ): Promise<RecipientProcessResult<T>[]> {
    if (recipients.length === 0) {
      return [];
    }

    const allResults: RecipientProcessResult<T>[] = [];

    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchResults = await this.processRecipients(batch, processor);
      allResults.push(...batchResults);
    }

    return allResults;
  }

  /**
   * Get statistics about processing results
   */
  getProcessingStats<T>(results: RecipientProcessResult<T>[]): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  } {
    const total = results.length;
    const successful = results.filter((r) => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      successRate,
    };
  }
}
