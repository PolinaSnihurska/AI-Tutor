/**
 * Integration Test Setup
 * 
 * This file sets up the test environment for integration tests
 */

// Extend Jest timeout for integration tests
jest.setTimeout(60000);

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
process.env.TEST_SERVICE_URL = process.env.TEST_SERVICE_URL || 'http://localhost:3003';
process.env.LEARNING_PLAN_SERVICE_URL = process.env.LEARNING_PLAN_SERVICE_URL || 'http://localhost:3004';
process.env.ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';
process.env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Global test setup
beforeAll(async () => {
  console.log('Starting integration tests...');
  console.log('Services:');
  console.log(`  Auth: ${process.env.AUTH_SERVICE_URL}`);
  console.log(`  Test: ${process.env.TEST_SERVICE_URL}`);
  console.log(`  Learning Plan: ${process.env.LEARNING_PLAN_SERVICE_URL}`);
  console.log(`  Analytics: ${process.env.ANALYTICS_SERVICE_URL}`);
  console.log(`  AI: ${process.env.AI_SERVICE_URL}`);
});

// Global test teardown
afterAll(async () => {
  console.log('Integration tests completed.');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
