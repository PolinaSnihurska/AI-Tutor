module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/integration'],
  testMatch: ['**/*.integration.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'integration/**/*.ts',
    '!integration/**/*.d.ts',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000, // 60 seconds for integration tests
  verbose: true,
  bail: false,
  maxWorkers: 1, // Run tests serially to avoid conflicts
  setupFilesAfterEnv: ['<rootDir>/integration/setup.ts'],
};
