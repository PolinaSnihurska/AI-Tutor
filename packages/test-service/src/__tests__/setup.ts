// Test setup file
process.env.NODE_ENV = 'test';
process.env.MONGO_DB = 'ai_tutor_test';
process.env.AI_SERVICE_URL = 'http://localhost:8000';

// Increase timeout for integration tests
jest.setTimeout(30000);
