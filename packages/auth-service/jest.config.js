module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/db/migrations/**',
  ],
  moduleNameMapper: {
    '^@ai-tutor/shared-types$': '<rootDir>/../shared-types/src',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
