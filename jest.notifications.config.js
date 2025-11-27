/**
 * Jest Configuration for Notifications Module Tests
 *
 * Optimized configuration specifically for running notification tests.
 * Use with: npm test -- --config jest.notifications.config.js
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  // Only run notification tests
  testRegex: 'modules/notifications/.*\\.spec\\.ts$',
  // Additional setup for notifications
  setupFilesAfterEnv: [
    '<rootDir>/test-setup.ts',
    '<rootDir>/modules/notifications/test/setup.ts',
  ],
  // Coverage only for notifications module
  collectCoverageFrom: [
    'modules/notifications/**/*.(t|j)s',
    '!modules/notifications/**/*.spec.ts',
    '!modules/notifications/**/*.interface.ts',
    '!modules/notifications/**/*.dto.ts',
    '!modules/notifications/**/*.enum.ts',
    '!modules/notifications/test/**',
  ],
  // Higher coverage threshold for notifications
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};


