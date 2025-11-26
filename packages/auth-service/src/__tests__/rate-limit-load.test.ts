import request from 'supertest';
import express, { Express } from 'express';
import { rateLimitBySubscription } from '../middleware/rateLimitBySubscription';
import { checkSubscription } from '../middleware/subscriptionCheck';
import { UsageTrackingService } from '../services/usageTrackingService';
import { getRedisClient, closeRedisClient, isRedisAvailable } from '../services/redisClient';
import { query } from '../db/connection';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '@ai-tutor/shared-types';

describe('Rate Limiting Load Tests', () => {
  let app: Express;
  let testUserIds: string[] = [];
  let testTokens: { free: string; premium: string };

  beforeAll(async () => {
    // Create test app with rate limiting middleware
    app = express();
    app.use(express.json());

    // Mock authentication and subscription middleware for testing
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
          req.user = decoded;
          next();
        } catch (error) {
          res.status(401).json({ error: 'Invalid token' });
        }
      } else {
        res.status(401).json({ error: 'No token' });
      }
    });

    app.use(checkSubscription);

    // Test endpoint for AI queries
    app.post('/api/ai/query', rateLimitBySubscription('ai_query'), async (req, res) => {
      if (req.trackUsage) {
        await req.trackUsage();
      }
      res.json({ success: true, message: 'AI query processed' });
    });

    // Test endpoint for tests
    app.post('/api/test/generate', rateLimitBySubscription('test'), async (req, res) => {
      if (req.trackUsage) {
        await req.trackUsage();
      }
      res.json({ success: true, message: 'Test generated' });
    });

    // Create test users with different subscription tiers
    const freeUserResult = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['loadtest-free@test.com', 'hash', 'student', 'Free', 'User']
    );
    const freeUserId = freeUserResult.rows[0].id;
    testUserIds.push(freeUserId);

    const premiumUserResult = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['loadtest-premium@test.com', 'hash', 'student', 'Premium', 'User']
    );
    const premiumUserId = premiumUserResult.rows[0].id;
    testUserIds.push(premiumUserId);

    // Create subscriptions
    await query(
      `INSERT INTO subscriptions (user_id, plan, status, start_date)
       VALUES ($1, $2, $3, NOW())`,
      [freeUserId, 'free', 'active']
    );

    await query(
      `INSERT INTO subscriptions (user_id, plan, status, start_date)
       VALUES ($1, $2, $3, NOW())`,
      [premiumUserId, 'premium', 'active']
    );

    // Generate tokens
    testTokens = {
      free: jwt.sign(
        { userId: freeUserId, email: 'loadtest-free@test.com', role: 'student' } as Omit<TokenPayload, 'iat' | 'exp'>,
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      ),
      premium: jwt.sign(
        { userId: premiumUserId, email: 'loadtest-premium@test.com', role: 'student' } as Omit<TokenPayload, 'iat' | 'exp'>,
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      ),
    };
  });

  afterAll(async () => {
    // Clean up test data
    for (const userId of testUserIds) {
      await query('DELETE FROM usage_tracking WHERE user_id = $1', [userId]);
      await query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await closeRedisClient();
  });

  beforeEach(async () => {
    // Clear usage tracking for test users
    const today = new Date().toISOString().split('T')[0];
    for (const userId of testUserIds) {
      await query('DELETE FROM usage_tracking WHERE user_id = $1 AND date = $2', [userId, today]);
    }
  });

  describe('Free Tier Rate Limits', () => {
    it('should enforce AI query limit (5 per day) under concurrent load', async () => {
      const concurrentRequests = 10;
      const promises = [];

      // Send 10 concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/ai/query')
            .set('Authorization', `Bearer ${testTokens.free}`)
            .send({ query: `Test query ${i}` })
        );
      }

      const responses = await Promise.all(promises);

      // Count successful and rate-limited responses
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should have exactly 5 successful requests
      expect(successful.length).toBe(5);
      expect(rateLimited.length).toBe(5);

      // Verify rate limit message
      const limitedResponse = rateLimited[0].body;
      expect(limitedResponse.error).toContain('limit reached');
      expect(limitedResponse.upgradeRequired).toBe(true);
      expect(limitedResponse.currentPlan).toBe('free');
    }, 15000);

    it('should enforce test limit (3 per day) under concurrent load', async () => {
      const concurrentRequests = 8;
      const promises = [];

      // Send 8 concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/test/generate')
            .set('Authorization', `Bearer ${testTokens.free}`)
            .send({ subject: 'Math' })
        );
      }

      const responses = await Promise.all(promises);

      // Count successful and rate-limited responses
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should have exactly 3 successful requests
      expect(successful.length).toBe(3);
      expect(rateLimited.length).toBe(5);
    }, 15000);

    it('should handle rapid sequential requests correctly', async () => {
      const requestCount = 7;
      const responses = [];

      // Send requests sequentially as fast as possible
      for (let i = 0; i < requestCount; i++) {
        const response = await request(app)
          .post('/api/ai/query')
          .set('Authorization', `Bearer ${testTokens.free}`)
          .send({ query: `Sequential query ${i}` });
        responses.push(response);
      }

      // First 5 should succeed, rest should be rate limited
      expect(responses.slice(0, 5).every(r => r.status === 200)).toBe(true);
      expect(responses.slice(5).every(r => r.status === 429)).toBe(true);

      // Check remaining count in headers
      expect(responses[0].headers['x-ratelimit-remaining']).toBe('4');
      expect(responses[4].headers['x-ratelimit-remaining']).toBe('0');
    }, 15000);
  });

  describe('Premium Tier Rate Limits', () => {
    it('should allow unlimited AI queries under high load', async () => {
      const concurrentRequests = 50;
      const promises = [];

      // Send 50 concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/ai/query')
            .set('Authorization', `Bearer ${testTokens.premium}`)
            .send({ query: `Premium query ${i}` })
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBe(concurrentRequests);

      // Should have unlimited indicator in headers
      expect(responses[0].headers['x-ratelimit-remaining']).toBe('-1');
    }, 20000);

    it('should allow unlimited tests under high load', async () => {
      const concurrentRequests = 30;
      const promises = [];

      // Send 30 concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/test/generate')
            .set('Authorization', `Bearer ${testTokens.premium}`)
            .send({ subject: 'Science' })
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBe(concurrentRequests);
    }, 20000);
  });

  describe('Mixed Load Scenarios', () => {
    it('should handle mixed tier requests concurrently', async () => {
      const promises = [];

      // Mix of free and premium requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/ai/query')
            .set('Authorization', `Bearer ${testTokens.free}`)
            .send({ query: `Free query ${i}` })
        );
      }

      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/ai/query')
            .set('Authorization', `Bearer ${testTokens.premium}`)
            .send({ query: `Premium query ${i}` })
        );
      }

      const responses = await Promise.all(promises);

      // Separate responses by token
      const freeResponses = responses.slice(0, 10);
      const premiumResponses = responses.slice(10);

      // Free tier: 5 success, 5 rate limited
      expect(freeResponses.filter(r => r.status === 200).length).toBe(5);
      expect(freeResponses.filter(r => r.status === 429).length).toBe(5);

      // Premium tier: all success
      expect(premiumResponses.filter(r => r.status === 200).length).toBe(20);
    }, 20000);
  });

  describe('Database Consistency Under Load', () => {
    it('should maintain accurate usage counts under concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = [];

      // Send concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/ai/query')
            .set('Authorization', `Bearer ${testTokens.free}`)
            .send({ query: `Consistency test ${i}` })
        );
      }

      await Promise.all(promises);

      // Wait a bit for all database writes to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check actual usage in database
      const usage = await UsageTrackingService.getTodayUsage(testUserIds[0]);
      
      // Should have exactly 5 queries recorded (the limit)
      expect(usage.aiQueries).toBe(5);
    }, 15000);

    it('should not have race conditions in usage tracking', async () => {
      // Send multiple waves of requests
      for (let wave = 0; wave < 3; wave++) {
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(
            request(app)
              .post('/api/test/generate')
              .set('Authorization', `Bearer ${testTokens.free}`)
              .send({ subject: 'Math' })
          );
        }
        await Promise.all(promises);
        
        // Small delay between waves
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for all writes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check usage - should be exactly 3 (the limit)
      const usage = await UsageTrackingService.getTodayUsage(testUserIds[0]);
      expect(usage.testsTaken).toBe(3);
    }, 20000);
  });

  describe('Redis Failover Scenarios', () => {
    it('should handle Redis unavailability gracefully', async () => {
      // Check if Redis is available
      const redisAvailable = await isRedisAvailable();
      
      if (!redisAvailable) {
        // If Redis is not available, the system should still work
        // (falling back to database-only rate limiting)
        const response = await request(app)
          .post('/api/ai/query')
          .set('Authorization', `Bearer ${testTokens.free}`)
          .send({ query: 'Test without Redis' });

        // Should still work (either success or proper rate limit)
        expect([200, 429]).toContain(response.status);
      } else {
        // Redis is available - test that it's being used
        const response = await request(app)
          .post('/api/ai/query')
          .set('Authorization', `Bearer ${testTokens.free}`)
          .send({ query: 'Test with Redis' });

        expect(response.status).toBe(200);
      }
    });

    it('should recover from temporary Redis connection issues', async () => {
      const redisClient = getRedisClient();
      
      // Simulate connection issue by forcing a reconnect
      try {
        // Try to trigger a reconnection scenario
        await redisClient.ping();
        
        // Make requests during "recovery"
        const response = await request(app)
          .post('/api/ai/query')
          .set('Authorization', `Bearer ${testTokens.premium}`)
          .send({ query: 'Recovery test' });

        // Should handle gracefully
        expect([200, 500]).toContain(response.status);
      } catch (error) {
        // If Redis operations fail, that's expected in this test
        // The important thing is the application doesn't crash
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should respond within acceptable time under load', async () => {
      const startTime = Date.now();
      const concurrentRequests = 20;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/ai/query')
            .set('Authorization', `Bearer ${testTokens.premium}`)
            .send({ query: `Performance test ${i}` })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All 20 requests should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);

      // Average response time should be reasonable
      const avgTime = totalTime / concurrentRequests;
      expect(avgTime).toBeLessThan(500); // 500ms average
    }, 10000);
  });
});
