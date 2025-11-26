import request from 'supertest';
import express, { Express } from 'express';
import subscriptionRoutes from '../routes/subscriptionRoutes';
import authRoutes from '../routes/authRoutes';
import pool from '../db/connection';
import { Subscription } from '../models';
import { SUBSCRIPTION_TIERS } from '@ai-tutor/shared-types';

let app: Express;

beforeAll(async () => {
  // Set up Express app
  app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  app.use('/subscriptions', subscriptionRoutes);
  
  // Clean up test data
  await pool.query('DELETE FROM parent_child_links WHERE 1=1');
  await pool.query('DELETE FROM subscriptions WHERE 1=1');
  await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
});

afterEach(async () => {
  // Clean up after each test
  await pool.query('DELETE FROM parent_child_links WHERE 1=1');
  await pool.query('DELETE FROM subscriptions WHERE 1=1');
  await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
});

describe('Subscription Service Integration Tests', () => {
  let studentToken: string;
  let studentUserId: string;
  let parentToken: string;
  let parentUserId: string;

  beforeEach(async () => {
    // Create a test student user
    const studentResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'student@test.com',
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Test',
        lastName: 'Student',
        age: 15,
        grade: 10,
      });

    studentToken = studentResponse.body.data.accessToken;
    studentUserId = studentResponse.body.data.user.id;

    // Create a test parent user
    const parentResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'parent@test.com',
        password: 'SecurePass123!',
        role: 'parent',
        firstName: 'Test',
        lastName: 'Parent',
      });

    parentToken = parentResponse.body.data.accessToken;
    parentUserId = parentResponse.body.data.user.id;
  });

  describe('GET /subscriptions - Get Subscription', () => {
    it('should create and return default free subscription for new user', async () => {
      const response = await request(app)
        .get('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
        features: SUBSCRIPTION_TIERS.free,
      });
    });

    it('should return existing subscription', async () => {
      // Create a premium subscription
      await Subscription.create({
        userId: studentUserId,
        plan: 'premium',
        status: 'active',
      });

      const response = await request(app)
        .get('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.plan).toBe('premium');
      expect(response.body.data.features).toEqual(SUBSCRIPTION_TIERS.premium);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/subscriptions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /subscriptions - Update Subscription', () => {
    it('should upgrade from free to premium', async () => {
      // Create free subscription
      await Subscription.create({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
      });

      const response = await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'premium' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plan).toBe('premium');
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.endDate).toBeTruthy();
    });

    it('should upgrade from premium to family', async () => {
      await Subscription.create({
        userId: parentUserId,
        plan: 'premium',
        status: 'active',
      });

      const response = await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ plan: 'family' });

      expect(response.status).toBe(200);
      expect(response.body.data.plan).toBe('family');
    });

    it('should downgrade from premium to free', async () => {
      await Subscription.create({
        userId: studentUserId,
        plan: 'premium',
        status: 'active',
      });

      const response = await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'free' });

      expect(response.status).toBe(200);
      expect(response.body.data.plan).toBe('free');
      expect(response.body.data.endDate).toBeNull();
    });

    it('should prevent downgrade if parent has too many children', async () => {
      // Create family subscription
      await Subscription.create({
        userId: parentUserId,
        plan: 'family',
        status: 'active',
      });

      // Create 2 child users and link them
      const child1Response = await request(app)
        .post('/auth/register')
        .send({
          email: 'child1@test.com',
          password: 'SecurePass123!',
          role: 'student',
          firstName: 'Child',
          lastName: 'One',
        });

      const child2Response = await request(app)
        .post('/auth/register')
        .send({
          email: 'child2@test.com',
          password: 'SecurePass123!',
          role: 'student',
          firstName: 'Child',
          lastName: 'Two',
        });

      // Link children to parent
      await pool.query(
        'INSERT INTO parent_child_links (parent_id, child_id) VALUES ($1, $2), ($1, $3)',
        [parentUserId, child1Response.body.data.user.id, child2Response.body.data.user.id]
      );

      // Try to downgrade to premium (max 1 child)
      const response = await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ plan: 'premium' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot downgrade');
      expect(response.body.error).toContain('2 children');
    });

    it('should reject invalid plan', async () => {
      await Subscription.create({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
      });

      const response = await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/subscriptions')
        .send({ plan: 'premium' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /subscriptions/cancel - Cancel Subscription', () => {
    it('should cancel premium subscription', async () => {
      await Subscription.create({
        userId: studentUserId,
        plan: 'premium',
        status: 'active',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .post('/subscriptions/cancel')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.message).toContain('until end date');
    });

    it('should cancel family subscription', async () => {
      await Subscription.create({
        userId: parentUserId,
        plan: 'family',
        status: 'active',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .post('/subscriptions/cancel')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should not allow cancelling free subscription', async () => {
      await Subscription.create({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
      });

      const response = await request(app)
        .post('/subscriptions/cancel')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot cancel free subscription');
    });

    it('should return 404 if no subscription exists', async () => {
      const response = await request(app)
        .post('/subscriptions/cancel')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Subscription State Transitions', () => {
    it('should transition from free to premium to cancelled', async () => {
      // Start with free
      await Subscription.create({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
      });

      let sub = await Subscription.findByUserId(studentUserId);
      expect(sub?.plan).toBe('free');
      expect(sub?.status).toBe('active');

      // Upgrade to premium
      await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'premium' });

      sub = await Subscription.findByUserId(studentUserId);
      expect(sub?.plan).toBe('premium');
      expect(sub?.status).toBe('active');

      // Cancel
      await request(app)
        .post('/subscriptions/cancel')
        .set('Authorization', `Bearer ${studentToken}`);

      sub = await Subscription.findByUserId(studentUserId);
      expect(sub?.status).toBe('cancelled');
    });

    it('should transition from premium to family to free', async () => {
      // Start with premium
      await Subscription.create({
        userId: parentUserId,
        plan: 'premium',
        status: 'active',
      });

      // Upgrade to family
      await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ plan: 'family' });

      let sub = await Subscription.findByUserId(parentUserId);
      expect(sub?.plan).toBe('family');

      // Downgrade to free
      await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ plan: 'free' });

      sub = await Subscription.findByUserId(parentUserId);
      expect(sub?.plan).toBe('free');
      expect(sub?.status).toBe('active');
    });

    it('should handle expired subscription', async () => {
      // Create expired subscription
      await Subscription.create({
        userId: studentUserId,
        plan: 'premium',
        status: 'expired',
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      const response = await request(app)
        .get('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      // Should be downgraded to free
      expect(response.body.data.plan).toBe('free');
      expect(response.body.data.status).toBe('active');
    });
  });

  describe('Tier-Based Feature Access', () => {
    it('should provide correct features for free tier', async () => {
      await Subscription.create({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
      });

      const response = await request(app)
        .get('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.data.features).toEqual({
        aiQueriesPerDay: 5,
        testsPerDay: 3,
        analyticsLevel: 'basic',
        familyMembers: 1,
        prioritySupport: false,
        materialAccess: 60,
      });
    });

    it('should provide correct features for premium tier', async () => {
      await Subscription.create({
        userId: studentUserId,
        plan: 'premium',
        status: 'active',
      });

      const response = await request(app)
        .get('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.data.features).toEqual({
        aiQueriesPerDay: 'unlimited',
        testsPerDay: 'unlimited',
        analyticsLevel: 'advanced',
        familyMembers: 1,
        prioritySupport: true,
        materialAccess: 100,
      });
    });

    it('should provide correct features for family tier', async () => {
      await Subscription.create({
        userId: parentUserId,
        plan: 'family',
        status: 'active',
      });

      const response = await request(app)
        .get('/subscriptions')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.body.data.features).toEqual({
        aiQueriesPerDay: 'unlimited',
        testsPerDay: 'unlimited',
        analyticsLevel: 'advanced',
        familyMembers: 3,
        prioritySupport: true,
        materialAccess: 100,
      });
    });

    it('should update features when upgrading', async () => {
      await Subscription.create({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
      });

      // Verify free features
      let response = await request(app)
        .get('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.data.features.aiQueriesPerDay).toBe(5);
      expect(response.body.data.features.testsPerDay).toBe(3);

      // Upgrade to premium
      await request(app)
        .put('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'premium' });

      // Verify premium features
      response = await request(app)
        .get('/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.data.features.aiQueriesPerDay).toBe('unlimited');
      expect(response.body.data.features.testsPerDay).toBe('unlimited');
      expect(response.body.data.features.analyticsLevel).toBe('advanced');
    });
  });
});
