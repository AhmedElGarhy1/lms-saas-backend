/**
 * Test Environment Guard
 *
 * Utility for ensuring tests run in the correct environment and validating
 * environment setup. Prevents inconsistent test behavior due to environment issues.
 *
 * @module test/helpers/test-env-guard
 */

/**
 * Test environment validation result
 */
export interface TestEnvValidationResult {
  /**
   * Whether the environment is valid
   */
  isValid: boolean;

  /**
   * Array of validation errors (if any)
   */
  errors: string[];

  /**
   * Array of warnings (non-critical issues)
   */
  warnings: string[];
}

/**
 * Configuration for test environment setup
 */
export interface TestEnvConfig {
  /**
   * Whether to throw on validation failure
   * @default true
   */
  throwOnError?: boolean;

  /**
   * Whether to log warnings
   * @default true
   */
  logWarnings?: boolean;

  /**
   * Additional environment variables to set
   */
  additionalEnvVars?: Record<string, string>;

  /**
   * Environment variables to validate are set
   */
  requiredEnvVars?: string[];
}

/**
 * Test Environment Guard
 *
 * Ensures tests run in a consistent, isolated environment and validates
 * environment configuration.
 */
export class TestEnvGuard {
  private static readonly REQUIRED_NODE_ENV = 'test';
  private static readonly JEST_INDICATORS = ['jest', 'test', 'spec'];

  /**
   * Validates that the current environment is suitable for running tests.
   *
   * @param config - Configuration options
   * @returns Validation result
   */
  static validateEnvironment(
    config: TestEnvConfig = {},
  ): TestEnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv !== TestEnvGuard.REQUIRED_NODE_ENV) {
      errors.push(
        `NODE_ENV must be '${TestEnvGuard.REQUIRED_NODE_ENV}'. Current: '${nodeEnv ?? 'undefined'}'`,
      );
    }

    // Check if running in Jest
    const isJestEnv =
      process.env.JEST_WORKER_ID !== undefined ||
      TestEnvGuard.JEST_INDICATORS.some((indicator) =>
        process.argv.some((arg) => arg.includes(indicator)),
      );

    if (!isJestEnv) {
      warnings.push(
        'Tests may not be running in Jest environment. Some features may not work correctly.',
      );
    }

    // Validate required environment variables
    if (config.requiredEnvVars) {
      for (const envVar of config.requiredEnvVars) {
        if (process.env[envVar] === undefined) {
          errors.push(`Required environment variable '${envVar}' is not set`);
        }
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
    };
  }

  /**
   * Ensures the test environment is properly configured.
   *
   * Throws an error if the environment is invalid (unless throwOnError is false).
   *
   * @param config - Configuration options
   * @throws Error if environment is invalid and throwOnError is true
   */
  static ensureTestEnvironment(config: TestEnvConfig = {}): void {
    const { throwOnError = true, logWarnings = true } = config;
    const result = TestEnvGuard.validateEnvironment(config);

    // Log warnings
    if (logWarnings && result.warnings.length > 0) {
      console.warn('Test Environment Warnings:');
      result.warnings.forEach((warning) => {
        console.warn(`  - ${warning}`);
      });
    }

    // Handle errors
    if (!result.isValid) {
      const errorMessage = [
        'Test environment validation failed:',
        ...result.errors.map((error) => `  - ${error}`),
      ].join('\n');

      if (throwOnError) {
        throw new Error(errorMessage);
      } else {
        console.error(errorMessage);
      }
    }
  }

  /**
   * Sets up the test environment with required configuration.
   *
   * This should be called in test setup files (e.g., jest.setup.ts) or
   * in beforeAll hooks.
   *
   * @param config - Configuration options
   */
  static setupTestEnvironment(config: TestEnvConfig = {}): void {
    // Set NODE_ENV to test
    process.env.NODE_ENV = TestEnvGuard.REQUIRED_NODE_ENV;

    // Set additional environment variables
    if (config.additionalEnvVars) {
      for (const [key, value] of Object.entries(config.additionalEnvVars)) {
        process.env[key] = value;
      }
    }

    // Validate after setup
    TestEnvGuard.ensureTestEnvironment(config);
  }

  /**
   * Resets the test environment to a clean state.
   *
   * Useful in afterAll hooks to clean up environment changes.
   *
   * @param originalEnv - Original environment variables to restore
   */
  static resetTestEnvironment(
    originalEnv: Record<string, string | undefined> = {},
  ): void {
    // Restore original NODE_ENV if provided
    if (originalEnv.NODE_ENV !== undefined) {
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    } else {
      delete process.env.NODE_ENV;
    }

    // Restore other original env vars
    for (const [key, value] of Object.entries(originalEnv)) {
      if (key === 'NODE_ENV') continue; // Already handled

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  /**
   * Captures the current environment state for later restoration.
   *
   * @returns Object containing current environment variables
   */
  static captureEnvironment(): Record<string, string | undefined> {
    return {
      NODE_ENV: process.env.NODE_ENV,
      JEST_WORKER_ID: process.env.JEST_WORKER_ID,
      // Add other relevant env vars as needed
    };
  }

  /**
   * Checks if the current process is running in a test environment.
   *
   * @returns True if running in test environment
   */
  static isTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === TestEnvGuard.REQUIRED_NODE_ENV ||
      process.env.JEST_WORKER_ID !== undefined ||
      TestEnvGuard.JEST_INDICATORS.some((indicator) =>
        process.argv.some((arg) => arg.includes(indicator)),
      )
    );
  }
}

