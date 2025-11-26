import request from 'supertest';
import axios from 'axios';

/**
 * Integration Test: Complete User Registration and Onboarding Flow
 * Tests Requirements: 9.1, 9.2, 11.1, 11.2, 11.3
 * 
 * This test validates the complete user journey from registration through onboarding
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const LEARNING_PLAN_SERVICE_URL = process.env.LEARNING_PLAN_SERVICE_URL || 'http://localhost:3004';

describe('User Registration and Onboarding Integration Tests', () => {
  const testEmail = `student-${Date.now()}@test.com`;
  const parentEmail = `parent-${Date.now()}@test.com`;
  let studentToken: string;
  let studentUserId: string;
  let parentToken: string;
  let parentUserId: string;

  describe('Student Registration and Onboarding', () => {
    it('should complete full student registration flow', async () => {
      // Step 1: Register student
      const registerResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
        email: testEmail,
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Test',
        lastName: 'Student',
        age: 15,
        grade: 10,
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.success).toBe(true);
      expect(registerResponse.data.data).toHaveProperty('accessToken');
      expect(registerResponse.data.data).toHaveProperty('refreshToken');
      expect(registerResponse.data.data.user).toMatchObject({
        email: testEmail,
        role: 'student',
        firstName: 'Test',
        lastName: 'Student',
      });

      studentToken = registerResponse.data.data.accessToken;
      studentUserId = registerResponse.data.data.user.id;
    });

    it('should have default free subscription after registration', async () => {
      const subscriptionResponse = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(subscriptionResponse.status).toBe(200);
      expect(subscriptionResponse.data.data).toMatchObject({
        userId: studentUserId,
        plan: 'free',
        status: 'active',
      });
      expect(subscriptionResponse.data.data.features).toMatchObject({
        aiQueriesPerDay: 5,
        testsPerDay: 3,
        analyticsLevel: 'basic',
      });
    });

    it('should create initial learning plan for student', async () => {
      const learningPlanResponse = await axios.post(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans`,
        {
          studentId: studentUserId,
          examType: 'NMT',
          examDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
          subjects: ['Mathematics', 'Physics'],
          currentLevel: 7,
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(learningPlanResponse.status).toBe(201);
      expect(learningPlanResponse.data).toHaveProperty('id');
      expect(learningPlanResponse.data.dailyTasks).toBeDefined();
      expect(learningPlanResponse.data.weeklyGoals).toBeDefined();
      expect(learningPlanResponse.data.subjects).toEqual(['Mathematics', 'Physics']);
    });

    it('should allow student to update profile after registration', async () => {
      const updateResponse = await axios.put(
        `${AUTH_SERVICE_URL}/users/profile`,
        {
          subjects: ['Mathematics', 'Physics', 'Chemistry'],
          preferences: {
            notificationsEnabled: true,
            studyReminders: true,
          },
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.data.subjects).toContain('Chemistry');
    });
  });

  describe('Parent Registration and Child Linking', () => {
    it('should complete full parent registration flow', async () => {
      // Step 1: Register parent
      const registerResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
        email: parentEmail,
        password: 'SecurePass123!',
        role: 'parent',
        firstName: 'Test',
        lastName: 'Parent',
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.data.user.role).toBe('parent');

      parentToken = registerResponse.data.data.accessToken;
      parentUserId = registerResponse.data.data.user.id;
    });

    it('should link parent to child account', async () => {
      const linkResponse = await axios.post(
        `${AUTH_SERVICE_URL}/parents/link-child`,
        {
          childEmail: testEmail,
        },
        {
          headers: { Authorization: `Bearer ${parentToken}` },
        }
      );

      expect(linkResponse.status).toBe(201);
      expect(linkResponse.data.success).toBe(true);
    });

    it('should allow parent to view linked children', async () => {
      const childrenResponse = await axios.get(`${AUTH_SERVICE_URL}/parents/children`, {
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      expect(childrenResponse.status).toBe(200);
      expect(Array.isArray(childrenResponse.data.data)).toBe(true);
      expect(childrenResponse.data.data.length).toBeGreaterThan(0);
      expect(childrenResponse.data.data[0]).toMatchObject({
        id: studentUserId,
        email: testEmail,
        role: 'student',
      });
    });

    it('should prevent parent from accessing non-linked child data', async () => {
      const otherStudentEmail = `other-student-${Date.now()}@test.com`;
      
      // Create another student
      const otherStudentResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
        email: otherStudentEmail,
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Other',
        lastName: 'Student',
      });

      const otherStudentId = otherStudentResponse.data.data.user.id;

      // Try to access analytics for non-linked child
      try {
        await axios.get(
          `${AUTH_SERVICE_URL}/parents/children/${otherStudentId}/analytics`,
          {
            headers: { Authorization: `Bearer ${parentToken}` },
          }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('Subscription Upgrade During Onboarding', () => {
    it('should allow student to upgrade to premium during onboarding', async () => {
      const upgradeResponse = await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'premium' },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(upgradeResponse.status).toBe(200);
      expect(upgradeResponse.data.data.plan).toBe('premium');
      expect(upgradeResponse.data.data.features.aiQueriesPerDay).toBe('unlimited');
    });

    it('should allow parent to upgrade to family plan', async () => {
      const upgradeResponse = await axios.put(
        `${AUTH_SERVICE_URL}/subscriptions`,
        { plan: 'family' },
        {
          headers: { Authorization: `Bearer ${parentToken}` },
        }
      );

      expect(upgradeResponse.status).toBe(200);
      expect(upgradeResponse.data.data.plan).toBe('family');
      expect(upgradeResponse.data.data.features.familyMembers).toBe(3);
    });
  });

  describe('Complete Onboarding Validation', () => {
    it('should verify all onboarding steps completed for student', async () => {
      // Verify user exists and is authenticated
      const profileResponse = await axios.get(`${AUTH_SERVICE_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.data.id).toBe(studentUserId);

      // Verify subscription is active
      const subscriptionResponse = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(subscriptionResponse.status).toBe(200);
      expect(subscriptionResponse.data.data.status).toBe('active');

      // Verify learning plan exists
      const learningPlanResponse = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );
      expect(learningPlanResponse.status).toBe(200);
      expect(learningPlanResponse.data.studentId).toBe(studentUserId);
    });

    it('should verify all onboarding steps completed for parent', async () => {
      // Verify parent profile
      const profileResponse = await axios.get(`${AUTH_SERVICE_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.data.role).toBe('parent');

      // Verify children are linked
      const childrenResponse = await axios.get(`${AUTH_SERVICE_URL}/parents/children`, {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      expect(childrenResponse.status).toBe(200);
      expect(childrenResponse.data.data.length).toBeGreaterThan(0);

      // Verify subscription supports family
      const subscriptionResponse = await axios.get(`${AUTH_SERVICE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      expect(subscriptionResponse.status).toBe(200);
      expect(subscriptionResponse.data.data.plan).toBe('family');
    });
  });
});
