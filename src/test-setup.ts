/**
 * Global Test Setup
 *
 * This file is run before all tests to ensure consistent test environment.
 *
 * Note: p-timeout and p-limit are ES modules. Jest is configured to transform them
 * via transformIgnorePatterns in package.json and @swc/jest handles ES modules.
 * No mocking needed - we can use these libraries directly in tests.
 */
