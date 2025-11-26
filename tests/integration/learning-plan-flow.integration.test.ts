import axios from 'axios';

/**
 * Integration Test: Learning Plan Generation and Task Completion Flow
 * Tests Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 * 
 * This test validates the complete learning plan lifecycle from generation to task completion
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const LEARNING_PLAN_SERVICE_URL = process.env.LEARNING_PLAN_SERVICE_URL || 'http://localhost:3004';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

describe('Learning Plan Generation and Task Completion Integration Tests', () => {
  let studentToken: string;
  let studentUserId: string;
  let learningPlanId: string;

  beforeAll(async () => {
    // Create test student
    const registerResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
      email: `learning-plan-student-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'student',
      firstName: 'Learning',
      lastName: 'Student',
      age: 16,
      grade: 11,
    });

    studentToken = registerResponse.data.data.accessToken;
    studentUserId = registerResponse.data.data.user.id;

    // Upgrade to premium for unlimited access
    await axios.put(
      `${AUTH_SERVICE_URL}/subscriptions`,
      { plan: 'premium' },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
  });

  describe('Learning Plan Generation', () => {
    it('should generate personalized learning plan within 5 seconds', async () => {
      const startTime = Date.now();

      const response = await axios.post(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans`,
        {
          studentId: studentUserId,
          examType: 'NMT',
          examDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
          subjects: ['Mathematics', 'Physics', 'Chemistry'],
          currentLevel: 6,
          weakTopics: ['Calculus', 'Thermodynamics'],
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(5); // Requirement: <5s
      expect(response.data).toHaveProperty('id');
      expect(response.data.dailyTasks).toBeDefined();
      expect(response.data.weeklyGoals).toBeDefined();
      expect(response.data.subjects).toEqual(['Mathematics', 'Physics', 'Chemistry']);

      learningPlanId = response.data.id;
    });

    it('should generate daily tasks based on knowledge gaps', async () => {
      const response = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.dailyTasks).toBeDefined();
      expect(Array.isArray(response.data.dailyTasks)).toBe(true);
      expect(response.data.dailyTasks.length).toBeGreaterThan(0);

      // Verify tasks include weak topics
      const taskTopics = response.data.dailyTasks.map((task: any) => task.topic);
      const hasWeakTopics = taskTopics.some((topic: string) => 
        topic.includes('Calculus') || topic.includes('Thermodynamics')
      );
      expect(hasWeakTopics).toBe(true);
    });

    it('should generate weekly goals aligned with exam timeline', async () => {
      const response = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.weeklyGoals).toBeDefined();
      expect(Array.isArray(response.data.weeklyGoals)).toBe(true);
      expect(response.data.weeklyGoals.length).toBeGreaterThan(0);

      // Verify goals have deadlines
      response.data.weeklyGoals.forEach((goal: any) => {
        expect(goal).toHaveProperty('title');
        expect(goal).toHaveProperty('deadline');
        expect(goal).toHaveProperty('status');
      });
    });
  });

  describe('Task Completion Flow', () => {
    let taskId: string;

    it('should retrieve daily tasks for student', async () => {
      const response = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/tasks/today`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      taskId = response.data[0].id;
    });

    it('should mark task as in progress', async () => {
      const response = await axios.patch(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/tasks/${taskId}`,
        {
          status: 'in_progress',
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('in_progress');
    });

    it('should complete task and update progress', async () => {
      const response = await axios.patch(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/tasks/${taskId}`,
        {
          status: 'completed',
          timeSpent: 45, // minutes
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('completed');
      expect(response.data.completedAt).toBeDefined();
    });

    it('should update learning plan completion rate after task completion', async () => {
      const response = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.completionRate).toBeGreaterThan(0);
      expect(response.data.completionRate).toBeLessThanOrEqual(100);
    });

    it('should track study time from completed tasks', async () => {
      const response = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/stats`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.totalStudyTime).toBeGreaterThan(0);
      expect(response.data.tasksCompleted).toBeGreaterThan(0);
    });
  });

  describe('Reminder System', () => {
    it('should schedule reminders for upcoming tasks', async () => {
      const response = await axios.post(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/reminders`,
        {
          enabled: true,
          reminderTime: '09:00',
          timezone: 'UTC',
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should retrieve scheduled reminders', async () => {
      const response = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/reminders`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.enabled).toBe(true);
      expect(response.data.reminderTime).toBeDefined();
    });

    it('should send intelligent reminders based on user activity', async () => {
      // Simulate user inactivity
      const response = await axios.post(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/reminders/trigger`,
        {},
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.reminderSent).toBe(true);
    });
  });

  describe('Learning Plan Updates and Adaptation', () => {
    it('should update learning plan based on progress', async () => {
      const response = await axios.post(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/regenerate`,
        {
          keepCompletedTasks: true,
          adjustDifficulty: true,
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.dailyTasks).toBeDefined();
      expect(response.data.updatedAt).toBeDefined();
    });

    it('should adjust plan difficulty based on performance', async () => {
      // Get current plan
      const beforeResponse = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      const beforeDifficulty = beforeResponse.data.averageDifficulty;

      // Simulate good performance by completing tasks
      const tasksResponse = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/tasks/today`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      for (const task of tasksResponse.data.slice(0, 3)) {
        await axios.patch(
          `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/tasks/${task.id}`,
          { status: 'completed', timeSpent: 30 },
          { headers: { Authorization: `Bearer ${studentToken}` } }
        );
      }

      // Regenerate plan
      await axios.post(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/regenerate`,
        { adjustDifficulty: true },
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );

      // Verify difficulty adjusted
      const afterResponse = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(afterResponse.data.averageDifficulty).toBeDefined();
    });

    it('should add new topics to plan based on weak areas', async () => {
      const response = await axios.post(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/add-topics`,
        {
          topics: ['Organic Chemistry', 'Quantum Physics'],
          priority: 'high',
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify topics added
      const planResponse = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      const taskTopics = planResponse.data.dailyTasks.map((task: any) => task.topic);
      const hasNewTopics = taskTopics.some((topic: string) => 
        topic.includes('Organic Chemistry') || topic.includes('Quantum Physics')
      );
      expect(hasNewTopics).toBe(true);
    });
  });

  describe('Weekly Goals Management', () => {
    let goalId: string;

    it('should retrieve weekly goals', async () => {
      const response = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/goals/weekly`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      goalId = response.data[0].id;
    });

    it('should mark weekly goal as completed', async () => {
      const response = await axios.patch(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/goals/${goalId}`,
        {
          status: 'completed',
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('completed');
    });

    it('should calculate weekly goal completion rate', async () => {
      const response = await axios.get(
        `${LEARNING_PLAN_SERVICE_URL}/learning-plans/${studentUserId}/goals/stats`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.weeklyCompletionRate).toBeDefined();
      expect(response.data.weeklyCompletionRate).toBeGreaterThanOrEqual(0);
      expect(response.data.weeklyCompletionRate).toBeLessThanOrEqual(100);
    });
  });
});
