/**
 * Global Test Setup
 *
 * This file is run before all tests to ensure consistent test environment.
 *
 * Note: p-timeout and p-limit are ES modules. Jest is configured to transform them
 * via transformIgnorePatterns in package.json and @swc/jest handles ES modules.
 * No mocking needed - we can use these libraries directly in tests.
 */

import { TestEnvGuard } from './modules/notifications/test/helpers/test-env-guard';

// Setup test environment using TestEnvGuard
// This ensures NotificationValidator and other services skip validation/initialization in tests
// We use throwOnError: false here to avoid interfering with tests that intentionally test invalid environments
TestEnvGuard.setupTestEnvironment({
  throwOnError: false, // Don't throw - just set up the environment
  logWarnings: false, // Don't log warnings in global setup
});
