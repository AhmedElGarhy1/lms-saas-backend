import { Logger } from '@nestjs/common';

/**
 * Retryable Redis error codes
 */
const RETRYABLE_REDIS_ERRORS = [
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'READONLY',
  'LOADING',
  'ECONNRESET',
  'EPIPE',
];

/**
 * Check if error is transient (retryable)
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorObj = error as Record<string, unknown>;
  const errorCode =
    (typeof errorObj.code === 'string' ? errorObj.code : '') || '';

  // Check against known retryable error codes
  if (RETRYABLE_REDIS_ERRORS.includes(errorCode)) {
    return true;
  }

  // Network-related errors
  if (
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('Connection is closed') ||
    errorMessage.includes('Redis')
  ) {
    return true;
  }

  return false;
}

/**
 * Retry operation with exponential backoff and AbortController support
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    baseDelayMs: number;
    operationName: string;
    logger?: Logger;
    context?: Record<string, unknown>;
    abortSignal?: AbortSignal;
  },
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    operationName,
    logger,
    context,
    abortSignal,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check if operation was aborted
    if (abortSignal?.aborted) {
      throw new Error(`${operationName} aborted`);
    }

    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if not a transient error
      if (!isTransientError(error)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delayMs = baseDelayMs * Math.pow(2, attempt);

      logger?.warn(
        `${operationName} failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delayMs}ms - ${JSON.stringify({ attempt: attempt + 1, maxAttempts, delayMs, error: lastError.message, ...context })}`,
      );

      // Wait with abort support
      await new Promise<void>((resolve, reject) => {
        if (abortSignal?.aborted) {
          reject(new Error(`${operationName} aborted during delay`));
          return;
        }

        const timeout = setTimeout(() => {
          if (abortSignal?.aborted) {
            reject(new Error(`${operationName} aborted during delay`));
          } else {
            resolve();
          }
        }, delayMs);

        // Cancel timeout if aborted
        abortSignal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error(`${operationName} aborted during delay`));
        });
      });
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
