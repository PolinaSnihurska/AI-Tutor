import axios from 'axios';

/**
 * Integration Test: Subscription Upgrade and Payment Flow
 * Tests Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * This test validates the complete subscription and payment lifecycle
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

describe('Subscription Upgrade and Payment Integration Tests', () => {
  let studentToken: string;
  let studentUserId: string;
  let parentToken: string;
  let parentUserId: string;

  beforeAll(async () => {
    // Create test student
    const studentResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
      email: `subscription-student-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'student',
      firstName: 'Subscription',
      lastName: 'Student',
      age: 16,
      grade: 11,
    });

    studentToken = studentResponse.data.data.accessToken;
    studentUserId = studentResponse.data.data.user.id;

    // Create test parent
    const parentResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
      email: `subscription-parent-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'parent',
      firstName: 'Subscription',
      lastName: 'Parent',
    });

    parentToken = parentResponse.data.data.accessToken;
    parentUserId = parentResponse.data.data.user.id;
  });

  describe('Initial Subscription State', () => {
    it('should have free subscription by default', async () => {
      const response = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toMatchObject({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
      });
      expect(response.data.data.features).toMatchObject({
        aiQueriesPerDay: 5,
        testsPerDay: 3,
        analyticsLevel: 'basic',
        familyMembers: 1,
        prioritySupport: false,
      });
    });

    it('should show feature limitations for free tier', async () => {
      const response = await axios.get(`${AUTH_SERVICE_URL}/subscriptions/features`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.currentPlan).toBe('free');
      expect(response.data.limitations).toBeDefined();
      expect(response.data.limitations.aiQueriesPerDay).toBe(5);
      expect(response.data.limitations.testsPerDay).toBe(3);
    });
  });

  describe('Subscription Upgrade Flow', () => {
    it('should upgrade from free to premium', async () => {
      const response = await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'premium' },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.plan).toBe('premium');
      expect(response.data.data.status).toBe('active');
      expect(response.data.data.endDate).toBeTruthy();
    });

    it('should have unlimited features after premium upgrade', async () => {
      const response = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.features).toMatchObject({
        aiQueriesPerDay: 'unlimited',
        testsPerDay: 'unlimited',
        analyticsLevel: 'advanced',
        prioritySupport: true,
      });
    });

    it('should upgrade parent from free to family plan', async () => {
      const response = await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'family' },
        {
          headers: { Authorization: `Bearer ${parentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.plan).toBe('family');
      expect(response.data.data.features.familyMembers).toBe(3);
    });
  });

  describe('Payment Processing', () => {
    it('should create Stripe checkout session for premium upgrade', async () => {
      // Create new user for payment test
      const newUserResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
        email: `payment-test-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Payment',
        lastName: 'Test',
      });

      const newUserToken = newUserResponse.data.data.accessToken;

      const response = await axios.post(
        `${AUTH_SERVICE_URL}/subscriptions/create-checkout-session`,
        {
          plan: 'premium',
          successUrl: 'http://localhost:3000/subscription/success',
          cancelUrl: 'http://localhost:3000/subscription/cancel',
        },
        {
          headers: { Authorization: `Bearer ${newUserToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.sessionId).toBeDefined();
      expect(response.data.url).toBeDefined();
      expect(response.data.url).toContain('stripe');
    });

    it('should handle successful payment webhook', async () => {
      // Simulate Stripe webhook for successful payment
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              userId: studentUserId,
              plan: 'premium',
            },
          },
        },
      };

      const response = await axios.post(
        `${AUTH_SERVICE_URL}/subscriptions/webhook`,
        webhookPayload,
        {
          headers: {
            'stripe-signature': 'test_signature',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.received).toBe(true);
    });

    it('should update subscription after successful payment', async () => {
      const response = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.plan).toBe('premium');
      expect(response.data.data.status).toBe('active');
    });

    it('should handle failed payment webhook', async () => {
      const webhookPayload = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              userId: studentUserId,
            },
          },
        },
      };

      const response = await axios.post(
        `${AUTH_SERVICE_URL}/subscriptions/webhook`,
        webhookPayload,
        {
          headers: {
            'stripe-signature': 'test_signature',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.received).toBe(true);
    });
  });

  describe('Subscription Downgrade', () => {
    it('should downgrade from premium to free', async () => {
      const response = await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'free' },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.plan).toBe('free');
      expect(response.data.data.endDate).toBeNull();
    });

    it('should restore feature limitations after downgrade', async () => {
      const response = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.features).toMatchObject({
        aiQueriesPerDay: 5,
        testsPerDay: 3,
        analyticsLevel: 'basic',
      });
    });

    it('should prevent downgrade if parent has too many children', async () => {
      // Create 3 children and link to parent
      const childEmails = [];
      for (let i = 0; i < 3; i++) {
        const childResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
          email: `child-${i}-${Date.now()}@test.com`,
          password: 'SecurePass123!',
          role: 'student',
          firstName: `Child${i}`,
          lastName: 'Test',
        });

        childEmails.push(childResponse.data.data.user.email);

        await axios.post(
          `${AUTH_SERVICE_URL}/parents/link-child`,
          { childEmail: childResponse.data.data.user.email },
          { headers: { Authorization: `Bearer ${parentToken}` } }
        );
      }

      // Try to downgrade from family (3 children) to premium (1 child)
      try {
        await axios.put(
          `${AUTH_SERVICE_URL}/subscriptions`,
          { plan: 'premium' },
          { headers: { Authorization: `Bearer ${parentToken}` } }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('Cannot downgrade');
        expect(error.response.data.error).toContain('children');
      }
    });
  });

  describe('Subscription Cancellation', () => {
    it('should cancel premium subscription', async () => {
      // First upgrade to premium
      await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'premium' },
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );

      // Then cancel
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/subscriptions/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe('cancelled');
      expect(response.data.message).toContain('until end date');
    });

    it('should maintain access until end of billing period', async () => {
      const response = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('cancelled');
      expect(response.data.data.endDate).toBeTruthy();
      
      // Should still have premium features until end date
      expect(response.data.data.features.aiQueriesPerDay).toBe('unlimited');
    });

    it('should not allow cancelling free subscription', async () => {
      // Create new user with free subscription
      const newUserResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
        email: `free-cancel-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Free',
        lastName: 'User',
      });

      const newUserToken = newUserResponse.data.data.accessToken;

      try {
        await axios.post(
          `${AUTH_SERVICE_URL}/subscriptions/cancel`,
          {},
          { headers: { Authorization: `Bearer ${newUserToken}` } }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('Cannot cancel free subscription');
      }
    });
  });

  describe('Subscription State Transitions', () => {
    it('should handle complete subscription lifecycle', async () => {
      // Create new user
      const userResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
        email: `lifecycle-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Lifecycle',
        lastName: 'Test',
      });

      const userToken = userResponse.data.data.accessToken;
      const userId = userResponse.data.data.user.id;

      // 1. Start with free
      let sub = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(sub.data.data.plan).toBe('free');
      expect(sub.data.data.status).toBe('active');

      // 2. Upgrade to premium
      await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'premium' },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      sub = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(sub.data.data.plan).toBe('premium');
      expect(sub.data.data.status).toBe('active');

      // 3. Cancel subscription
      await axios.post(
        `${AUTH_SERVICE_URL}/subscriptions/cancel`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      sub = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(sub.data.data.status).toBe('cancelled');

      // 4. Downgrade to free
      await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'free' },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      sub = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(sub.data.data.plan).toBe('free');
      expect(sub.data.data.status).toBe('active');
    });

    it('should handle expired subscription', async () => {
      // This would typically be handled by a cron job
      // For testing, we can simulate the expiration check
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/subscriptions/check-expired`,
        {},
        {
          headers: {
            'x-api-key': process.env.INTERNAL_API_KEY || 'test-key',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.expiredCount).toBeDefined();
    });
  });

  describe('Billing and Invoices', () => {
    it('should retrieve billing history', async () => {
      const response = await axios.get(`${AUTH_SERVICE_URL}/subscriptions/billing-history`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.invoices)).toBe(true);
    });

    it('should retrieve upcoming invoice', async () => {
      // Upgrade to premium first
      await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'premium' },
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );

      const response = await axios.get(`${AUTH_SERVICE_URL}/subscriptions/upcoming-invoice`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.amount).toBeDefined();
      expect(response.data.dueDate).toBeDefined();
    });

    it('should update payment method', async () => {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/subscriptions/update-payment-method`,
        {
          paymentMethodId: 'pm_test_123',
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Feature Access Control', () => {
    it('should enforce rate limits based on subscription tier', async () => {
      // Create user with free tier
      const freeUserResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
        email: `rate-limit-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'RateLimit',
        lastName: 'Test',
      });

      const freeUserToken = freeUserResponse.data.data.accessToken;

      // Make 5 AI queries (free tier limit)
      for (let i = 0; i < 5; i++) {
        const response = await axios.post(
          `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/explanations`,
          {
            topic: 'Test Topic',
            subject: 'Mathematics',
            studentLevel: 10,
          },
          {
            headers: { Authorization: `Bearer ${freeUserToken}` },
          }
        );
        expect(response.status).toBe(200);
      }

      // 6th query should be rate limited
      try {
        await axios.post(
          `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/explanations`,
          {
            topic: 'Test Topic',
            subject: 'Mathematics',
            studentLevel: 10,
          },
          {
            headers: { Authorization: `Bearer ${freeUserToken}` },
          }
        );
        fail('Should have been rate limited');
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.data.error).toContain('rate limit');
      }
    });

    it('should allow unlimited access for premium users', async () => {
      // Premium user should not be rate limited
      for (let i = 0; i < 10; i++) {
        const response = await axios.post(
          `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/explanations`,
          {
            topic: 'Test Topic',
            subject: 'Mathematics',
            studentLevel: 10,
          },
          {
            headers: { Authorization: `Bearer ${studentToken}` },
          }
        );
        expect(response.status).toBe(200);
      }
    });
  });
});
