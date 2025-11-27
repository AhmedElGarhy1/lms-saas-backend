module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          target: 'es2022',
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
        module: {
          type: 'commonjs',
          // Use lazy import to help with circular dependencies
          lazy: false,
        },
      },
    ],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.enum.ts',
    '!**/test/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(p-timeout|p-limit|@faker-js|yocto-queue)/)',
  ],
  // Allow circular dependencies that work at runtime
  // Type-only imports (import type) help break the cycle at compile time
  // while still allowing TypeORM decorators to work with lazy functions
  // Test timeout: 30 seconds default, can be overridden per test
  testTimeout: 30000,
  // Run tests serially to avoid database/Redis conflicts
  maxWorkers: 1,
  // Clear mocks between tests for better isolation
  clearMocks: true,
  restoreMocks: true,
  // Show coverage for untested files
  coverageReporters: ['text', 'lcov', 'html'],
};
