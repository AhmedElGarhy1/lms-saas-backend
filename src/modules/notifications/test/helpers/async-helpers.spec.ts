/**
 * Async Helpers Tests
 *
 * Tests for async helper utilities to ensure they work correctly.
 */

import {
  waitFor,
  waitForValue,
  flushPromises,
  delay,
  retry,
  type WaitForOptions,
  type RetryOptions,
} from './async-helpers';

describe('Async Helpers', () => {
  describe('waitFor', () => {
    it('should resolve when condition becomes true', async () => {
      let condition = false;
      setTimeout(() => {
        condition = true;
      }, 50);

      await waitFor(() => condition, { timeout: 1000 });
      expect(condition).toBe(true);
    });

    it('should throw error when condition times out', async () => {
      await expect(
        waitFor(() => false, { timeout: 100 }),
      ).rejects.toThrow('timed out');
    });

    it('should use custom error message on timeout', async () => {
      await expect(
        waitFor(() => false, {
          timeout: 100,
          errorMessage: 'Custom timeout message',
        }),
      ).rejects.toThrow('Custom timeout message');
    });

    it('should handle async conditions', async () => {
      let resolved = false;
      const promise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          resolved = true;
          resolve(true);
        }, 50);
      });

      await waitFor(async () => {
        await promise;
        return resolved;
      });

      expect(resolved).toBe(true);
    });

    it('should respect custom interval', async () => {
      let checkCount = 0;
      const condition = () => {
        checkCount++;
        // Return true after 3 checks
        if (checkCount >= 3) {
          return true;
        }
        // Add small delay to ensure interval is respected
        return false;
      };

      const start = Date.now();
      await waitFor(condition, { timeout: 1000, interval: 50 });
      const elapsed = Date.now() - start;

      expect(checkCount).toBeGreaterThanOrEqual(3);
      // Should have taken at least 2 intervals (100ms) with some tolerance
      expect(elapsed).toBeGreaterThanOrEqual(80);
    });
  });

  describe('waitForValue', () => {
    it('should return value when condition becomes truthy', async () => {
      let value: string | null = null;
      setTimeout(() => {
        value = 'test-value';
      }, 50);

      const result = await waitForValue(() => value, { timeout: 1000 });
      expect(result).toBe('test-value');
    });

    it('should throw error when condition never becomes truthy', async () => {
      await expect(
        waitForValue(() => null, { timeout: 100 }),
      ).rejects.toThrow('timed out');
    });

    it('should handle async value resolution', async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('async-value'), 50);
      });

      const result = await waitForValue(async () => {
        const val = await promise;
        return val || null;
      });

      expect(result).toBe('async-value');
    });
  });

  describe('flushPromises', () => {
    it('should flush pending promises', async () => {
      let resolved = false;
      Promise.resolve().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);
      await flushPromises();
      expect(resolved).toBe(true);
    });

    it('should flush multiple iterations', async () => {
      let count = 0;
      Promise.resolve().then(() => {
        count++;
        Promise.resolve().then(() => {
          count++;
        });
      });

      await flushPromises(2);
      expect(count).toBe(2);
    });
  });

  describe('delay', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;

      // Allow some tolerance for timing
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await retry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempt = 0;
      const operation = jest.fn(async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await retry(operation, { maxAttempts: 5 });
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error('Always fails'));

      await expect(
        retry(operation, { maxAttempts: 3 }),
      ).rejects.toThrow('failed after 3 attempts');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff when enabled', async () => {
      const callTimes: number[] = [];

      const operation = jest.fn(async () => {
        callTimes.push(Date.now());
        throw new Error('Fail');
      });

      try {
        await retry(operation, {
          maxAttempts: 3,
          delay: 50,
          backoff: true,
        });
      } catch {
        // Expected to fail
      }

      // Should have been called 3 times
      expect(operation).toHaveBeenCalledTimes(3);
      expect(callTimes.length).toBe(3);

      // Calculate delays between calls
      if (callTimes.length >= 3) {
        const delay1 = callTimes[1] - callTimes[0]; // First retry delay
        const delay2 = callTimes[2] - callTimes[1]; // Second retry delay

        // First delay should be ~50ms, second should be ~100ms (exponential)
        // Allow tolerance for timing
        expect(delay1).toBeGreaterThanOrEqual(40);
        expect(delay1).toBeLessThan(100);
        expect(delay2).toBeGreaterThanOrEqual(80); // Should be ~2x delay1
        expect(delay2).toBeLessThan(200);
        expect(delay2).toBeGreaterThan(delay1); // Second delay should be longer
      }
    });

    it('should respect shouldRetry predicate', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error('Non-retryable error'));

      const shouldRetry = (error: unknown) => {
        return error instanceof Error && error.message.includes('Retryable');
      };

      await expect(
        retry(operation, {
          maxAttempts: 3,
          shouldRetry,
        }),
      ).rejects.toThrow('Non-retryable error');

      // Should not retry
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

