import pool from '../db/connection';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_tutor_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Clean up database after all tests
afterAll(async () => {
  await pool.end();
});
