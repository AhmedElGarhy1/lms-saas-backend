/**
 * Test Environment Guard Tests
 *
 * Tests for TestEnvGuard utility to ensure environment validation works correctly.
 */

import {
  TestEnvGuard,
  type TestEnvConfig,
} from './test-env-guard';

describe('TestEnvGuard', () => {
  const originalEnv = TestEnvGuard.captureEnvironment();

  beforeEach(() => {
    // Ensure we're in test environment for these tests
    process.env.NODE_ENV = 'test';
    process.env.JEST_WORKER_ID = '1'; // Ensure Jest environment
  });

  afterEach(() => {
    // Restore original environment
    TestEnvGuard.resetTestEnvironment(originalEnv);
  });

  describe('validateEnvironment', () => {
    it('should validate correct test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.JEST_WORKER_ID = '1';

      const result = TestEnvGuard.validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid NODE_ENV', () => {
      // Temporarily set to production for this test
      const savedNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const result = TestEnvGuard.validateEnvironment();

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "NODE_ENV must be 'test'. Current: 'production'",
        );
      } finally {
        // Restore
        process.env.NODE_ENV = savedNodeEnv;
      }
    });

    it('should warn when not in Jest environment', () => {
      // Temporarily remove Jest indicators
      const savedWorkerId = process.env.JEST_WORKER_ID;
      const savedArgv = [...process.argv];
      delete process.env.JEST_WORKER_ID;
      process.argv = ['node', 'script.js']; // No jest indicators

      try {
        const result = TestEnvGuard.validateEnvironment();

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('Jest environment');
      } finally {
        // Restore
        if (savedWorkerId) {
          process.env.JEST_WORKER_ID = savedWorkerId;
        }
        process.argv = savedArgv;
      }
    });

    it('should validate required environment variables', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.REQUIRED_VAR;

      const config: TestEnvConfig = {
        requiredEnvVars: ['REQUIRED_VAR'],
      };

      const result = TestEnvGuard.validateEnvironment(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Required environment variable 'REQUIRED_VAR' is not set",
      );
    });
  });

  describe('ensureTestEnvironment', () => {
    it('should throw error on invalid environment by default', () => {
      // Temporarily set to production
      const savedNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        expect(() => {
          TestEnvGuard.ensureTestEnvironment();
        }).toThrow('Test environment validation failed');
      } finally {
        // Restore
        process.env.NODE_ENV = savedNodeEnv;
      }
    });

    it('should not throw when throwOnError is false', () => {
      // Temporarily set to production
      const savedNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        expect(() => {
          TestEnvGuard.ensureTestEnvironment({ throwOnError: false });
        }).not.toThrow();
      } finally {
        // Restore
        process.env.NODE_ENV = savedNodeEnv;
      }
    });

    it('should log warnings when logWarnings is true', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      // Temporarily remove Jest indicators
      const savedWorkerId = process.env.JEST_WORKER_ID;
      const savedArgv = [...process.argv];
      delete process.env.JEST_WORKER_ID;
      process.argv = ['node', 'script.js'];

      try {
        TestEnvGuard.ensureTestEnvironment({ logWarnings: true });

        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        // Restore
        if (savedWorkerId) {
          process.env.JEST_WORKER_ID = savedWorkerId;
        }
        process.argv = savedArgv;
        consoleSpy.mockRestore();
      }
    });
  });

  describe('setupTestEnvironment', () => {
    it('should set NODE_ENV to test', () => {
      // Temporarily remove NODE_ENV
      const savedNodeEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      try {
        TestEnvGuard.setupTestEnvironment({ throwOnError: false });

        expect(process.env.NODE_ENV).toBe('test');
      } finally {
        // Restore
        if (savedNodeEnv) {
          process.env.NODE_ENV = savedNodeEnv;
        }
      }
    });

    it('should set additional environment variables', () => {
      const config: TestEnvConfig = {
        additionalEnvVars: {
          TEST_VAR: 'test-value',
          ANOTHER_VAR: 'another-value',
        },
      };

      TestEnvGuard.setupTestEnvironment(config);

      expect(process.env.TEST_VAR).toBe('test-value');
      expect(process.env.ANOTHER_VAR).toBe('another-value');
    });

    it('should validate environment after setup', () => {
      // Temporarily set to production
      const savedNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        // This should not throw because setupTestEnvironment sets NODE_ENV to 'test' first
        TestEnvGuard.setupTestEnvironment({ throwOnError: false });

        // Should have set NODE_ENV to test
        expect(process.env.NODE_ENV).toBe('test');
      } finally {
        // Restore
        process.env.NODE_ENV = savedNodeEnv;
      }
    });
  });

  describe('resetTestEnvironment', () => {
    it('should restore original environment variables', () => {
      // Capture original state
      const original = TestEnvGuard.captureEnvironment();
      const originalCustomVar = process.env.CUSTOM_VAR;

      // Make changes
      process.env.NODE_ENV = 'test';
      process.env.CUSTOM_VAR = 'custom-value';

      // Reset with original (including CUSTOM_VAR if it existed)
      const resetEnv = {
        ...original,
        CUSTOM_VAR: originalCustomVar, // Include in reset to properly restore
      };
      TestEnvGuard.resetTestEnvironment(resetEnv);

      expect(process.env.NODE_ENV).toBe(original.NODE_ENV);
      // CUSTOM_VAR should be restored to original value (or undefined if it didn't exist)
      if (originalCustomVar === undefined) {
        expect(process.env.CUSTOM_VAR).toBeUndefined();
      } else {
        expect(process.env.CUSTOM_VAR).toBe(originalCustomVar);
      }
    });

    it('should delete variables that were explicitly set to undefined in original', () => {
      // Set a variable
      process.env.TEMP_VAR = 'temp-value';

      // Reset with TEMP_VAR explicitly set to undefined
      TestEnvGuard.resetTestEnvironment({
        NODE_ENV: process.env.NODE_ENV,
        TEMP_VAR: undefined, // Explicitly mark for deletion
      });

      expect(process.env.TEMP_VAR).toBeUndefined();
    });

    it('should restore NODE_ENV when provided', () => {
      const savedNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      TestEnvGuard.resetTestEnvironment({ NODE_ENV: 'production' });

      expect(process.env.NODE_ENV).toBe('production');

      // Restore
      process.env.NODE_ENV = savedNodeEnv;
    });
  });

  describe('captureEnvironment', () => {
    it('should capture current environment state', () => {
      process.env.NODE_ENV = 'test';
      process.env.JEST_WORKER_ID = '123';

      const captured = TestEnvGuard.captureEnvironment();

      expect(captured.NODE_ENV).toBe('test');
      expect(captured.JEST_WORKER_ID).toBe('123');
    });
  });

  describe('isTestEnvironment', () => {
    it('should return true when NODE_ENV is test', () => {
      const savedNodeEnv = process.env.NODE_ENV;
      const savedWorkerId = process.env.JEST_WORKER_ID;
      process.env.NODE_ENV = 'test';
      delete process.env.JEST_WORKER_ID;

      try {
        expect(TestEnvGuard.isTestEnvironment()).toBe(true);
      } finally {
        process.env.NODE_ENV = savedNodeEnv;
        if (savedWorkerId) {
          process.env.JEST_WORKER_ID = savedWorkerId;
        }
      }
    });

    it('should return true when JEST_WORKER_ID is set', () => {
      const savedNodeEnv = process.env.NODE_ENV;
      const savedWorkerId = process.env.JEST_WORKER_ID;
      process.env.NODE_ENV = 'production';
      process.env.JEST_WORKER_ID = '1';

      try {
        expect(TestEnvGuard.isTestEnvironment()).toBe(true);
      } finally {
        process.env.NODE_ENV = savedNodeEnv;
        if (savedWorkerId) {
          process.env.JEST_WORKER_ID = savedWorkerId;
        } else {
          delete process.env.JEST_WORKER_ID;
        }
      }
    });

    it('should return true when process.argv contains jest', () => {
      const savedNodeEnv = process.env.NODE_ENV;
      const savedWorkerId = process.env.JEST_WORKER_ID;
      const savedArgv = [...process.argv];
      process.env.NODE_ENV = 'production';
      delete process.env.JEST_WORKER_ID;
      process.argv = ['node', 'jest', 'test.spec.ts'];

      try {
        expect(TestEnvGuard.isTestEnvironment()).toBe(true);
      } finally {
        process.env.NODE_ENV = savedNodeEnv;
        if (savedWorkerId) {
          process.env.JEST_WORKER_ID = savedWorkerId;
        }
        process.argv = savedArgv;
      }
    });

    it('should return false when not in test environment', () => {
      const savedNodeEnv = process.env.NODE_ENV;
      const savedWorkerId = process.env.JEST_WORKER_ID;
      const savedArgv = [...process.argv];
      process.env.NODE_ENV = 'production';
      delete process.env.JEST_WORKER_ID;
      process.argv = ['node', 'script.js'];

      try {
        expect(TestEnvGuard.isTestEnvironment()).toBe(false);
      } finally {
        process.env.NODE_ENV = savedNodeEnv;
        if (savedWorkerId) {
          process.env.JEST_WORKER_ID = savedWorkerId;
        }
        process.argv = savedArgv;
      }
    });
  });
});

