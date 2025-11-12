/**
 * Async Test Helpers
 *
 * Utilities for handling asynchronous operations in tests with proper type safety
 * and error handling. These helpers make tests more stable and deterministic.
 *
 * @module test/helpers/async-helpers
 */

/**
 * Options for waitFor function
 */
export interface WaitForOptions {
  /**
   * Maximum time to wait in milliseconds
   * @default 5000
   */
  timeout?: number;

  /**
   * Interval between condition checks in milliseconds
   * @default 50
   */
  interval?: number;

  /**
   * Custom error message to throw on timeout
   */
  errorMessage?: string;
}

/**
 * Waits for a condition to become true, checking at regular intervals.
 *
 * This is useful for waiting for async operations to complete, state changes,
 * or any condition that may take time to satisfy.
 *
 * @template T - The type of value returned by the condition function
 * @param condition - Function that returns a boolean or Promise<boolean> indicating if condition is met
 * @param options - Configuration options for waiting behavior
 * @returns Promise that resolves when condition is true
 * @throws Error if condition is not met within timeout period
 *
 * @example
 * ```typescript
 * // Wait for a value to be set
 * await waitFor(() => someValue !== undefined);
 *
 * // Wait for async condition
 * await waitFor(async () => {
 *   const result = await someAsyncOperation();
 *   return result.status === 'complete';
 * });
 *
 * // With custom timeout
 * await waitFor(() => condition, { timeout: 10000, interval: 100 });
 * ```
 */
export async function waitFor<T = void>(
  condition: () => boolean | Promise<boolean>,
  options: WaitForOptions = {},
): Promise<T> {
  const { timeout = 5000, interval = 50, errorMessage } = options;

  const start = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - start < timeout) {
    try {
      const result = await condition();
      if (result) {
        return undefined as T;
      }
    } catch (error) {
      // Store the last error but continue checking
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // Timeout reached - throw descriptive error
  const elapsed = Date.now() - start;
  const message =
    errorMessage ??
    `waitFor condition timed out after ${elapsed}ms (timeout: ${timeout}ms)`;

  const error = new Error(message);
  if (lastError) {
    error.cause = lastError;
    error.stack = `${error.stack}\n\nLast condition error:\n${lastError.stack}`;
  }

  throw error;
}

/**
 * Waits for a condition to become true and returns the result.
 *
 * Similar to waitFor but returns the value from the condition function
 * when it becomes truthy.
 *
 * @template T - The type of value returned by the condition function
 * @param condition - Function that returns a value or Promise<value>
 * @param options - Configuration options for waiting behavior
 * @returns Promise that resolves with the condition result when truthy
 * @throws Error if condition is not met within timeout period
 *
 * @example
 * ```typescript
 * // Wait for a value to be set and return it
 * const value = await waitForValue(() => someValue);
 *
 * // Wait for async result
 * const result = await waitForValue(async () => {
 *   const data = await fetchData();
 *   return data?.status === 'ready' ? data : null;
 * });
 * ```
 */
export async function waitForValue<T>(
  condition: () => T | Promise<T>,
  options: WaitForOptions = {},
): Promise<T> {
  const { timeout = 5000, interval = 50, errorMessage } = options;

  const start = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - start < timeout) {
    try {
      const result = await condition();
      if (result) {
        return result as T;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  const elapsed = Date.now() - start;
  const message =
    errorMessage ??
    `waitForValue condition timed out after ${elapsed}ms (timeout: ${timeout}ms)`;

  const error = new Error(message);
  if (lastError) {
    error.cause = lastError;
    error.stack = `${error.stack}\n\nLast condition error:\n${lastError.stack}`;
  }

  throw error;
}

/**
 * Flushes all pending promises in the event loop.
 *
 * This ensures that all microtasks (promises, queueMicrotask, etc.) are executed
 * before continuing. Useful for testing async code that uses promises.
 *
 * @param iterations - Number of event loop ticks to flush (default: 2)
 * @returns Promise that resolves after flushing
 *
 * @example
 * ```typescript
 * // Flush promises after triggering async operation
 * triggerAsyncOperation();
 * await flushPromises();
 * expect(result).toBeDefined();
 *
 * // With custom iterations for complex async flows
 * await flushPromises(3);
 * ```
 */
export async function flushPromises(iterations: number = 2): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

/**
 * Waits for a specific amount of time.
 *
 * Prefer using waitFor or flushPromises when possible, but this can be useful
 * for testing time-based behavior or when you need a simple delay.
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 *
 * @example
 * ```typescript
 * // Wait 100ms
 * await delay(100);
 * ```
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async operation until it succeeds or max attempts are reached.
 *
 * @template T - The type of value returned by the operation
 * @param operation - Async function to retry
 * @param options - Retry configuration
 * @returns Promise that resolves with the operation result
 * @throws Error if operation fails after all retries
 *
 * @example
 * ```typescript
 * // Retry with default options (3 attempts, 100ms delay)
 * const result = await retry(() => someAsyncOperation());
 *
 * // Custom retry configuration
 * const result = await retry(
 *   () => someAsyncOperation(),
 *   { maxAttempts: 5, delay: 200, backoff: true }
 * );
 * ```
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Delay between retries in milliseconds
   * @default 100
   */
  delay?: number;

  /**
   * Whether to use exponential backoff
   * @default false
   */
  backoff?: boolean;

  /**
   * Custom error predicate - only retry if this returns true
   */
  shouldRetry?: (error: unknown) => boolean;
}

export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: delayMs = 100,
    backoff = false,
    shouldRetry,
  } = options;

  let lastError: unknown;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxAttempts) {
        await delay(currentDelay);
        if (backoff) {
          currentDelay *= 2;
        }
      }
    }
  }

  // All attempts failed
  const error =
    lastError instanceof Error
      ? lastError
      : new Error(String(lastError ?? 'Unknown error'));

  error.message = `Operation failed after ${maxAttempts} attempts: ${error.message}`;
  throw error;
}
