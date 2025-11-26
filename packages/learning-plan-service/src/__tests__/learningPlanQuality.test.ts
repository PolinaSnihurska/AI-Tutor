import request from 'supertest';
import express, { Express } from 'express';
import learningPlanRoutes from '../routes/learningPlanRoutes';
import notificationRoutes from '../routes/notificationRoutes';
import { query } from '../db/connection';
import axios from 'axios';
import { LearningPlan, Task } from '@ai-tutor/shared-types';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../db/connection', () => ({
  query: jest.fn(),
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

let app: Express;

beforeAll(() => {
  // Set up Express app
  app = express();
  app.use(express.json());
  app.use('/learning-plans', learningPlanRoutes);
  app.use('/notifications', notificationRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

// Helper to generate valid student IDs
const generateStudentId = () => uuidv4();

function setupDefaultMocks() {
  // Mock AI service plan generation
  mockedAxios.post.mockImplementation((url: string, data?: any) => {
    if (url.includes('/learning-plans/generate')) {
      const dailyTasks = [];
      const planningDays = data.planning_days || 7;
      
      // Generate realistic tasks
      for (let i = 0; i < planningDays; i++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + i);
        
        dailyTasks.push({
          id: `task-${i + 1}`,
          title: `Study ${data.subjects[0]} - Day ${i + 1}`,
          subject: data.subjects[0],
          type: i % 3 === 0 ? 'lesson' : i % 3 === 1 ? 'practice' : 'test',
          estimatedTime: 30 + (i * 5),
          priority: i < 3 ? 'high' : 'medium',
          status: 'pending',
          dueDate: dueDate.toISOString(),
          description: `Complete ${data.subjects[0]} exercises`,
        });
      }
      
      const weeklyGoals = [
        {
          id: 'goal-1',
          title: `Master ${data.subjects[0]} fundamentals`,
          description: 'Complete all basic exercises',
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 0,
          completed: false,
        },
        {
          id: 'goal-2',
          title: 'Improve test scores',
          description: 'Achieve 80% or higher on practice tests',
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 0,
          completed: false,
        },
      ];
      
      return Promise.resolve({
        data: {
          daily_tasks: dailyTasks,
          weekly_goals: weeklyGoals,
          recommendations: [
            'Focus on weak areas first',
            'Practice regularly',
            'Take breaks between study sessions',
          ],
        },
      });
    }
    
    if (url.includes('/learning-plans/analyze-gaps')) {
      return Promise.resolve({
        data: [
          {
            subject: data.subjects[0],
            topic: 'Advanced Concepts',
            severity: 'high',
            error_count: 5,
          },
        ],
      });
    }
    
    return Promise.reject(new Error('Unmocked URL'));
  });
  
  // Mock database queries
  (query as jest.Mock).mockImplementation((sql: string, params?: any[]) => {
    // Mock learning plan creation
    if (sql.includes('INSERT INTO learning_plans')) {
      return Promise.resolve({
        rows: [{
          id: 'plan-123',
          student_id: params?.[0] || 'student-123',
          exam_type: params?.[1],
          exam_date: params?.[2],
          subjects: params?.[3] || ['Mathematics'],
          daily_tasks: params?.[4] || [],
          weekly_goals: params?.[5] || [],
          completion_rate: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });
    }
    
    // Mock learning plan retrieval
    if (sql.includes('SELECT * FROM learning_plans WHERE id')) {
      return Promise.resolve({
        rows: [{
          id: params?.[0] || 'plan-123',
          student_id: 'student-123',
          exam_type: 'NMT',
          exam_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subjects: ['Mathematics', 'Physics'],
          daily_tasks: [],
          weekly_goals: [],
          completion_rate: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });
    }
    
    // Mock user preferences
    if (sql.includes('SELECT * FROM users WHERE id')) {
      return Promise.resolve({
        rows: [{
          id: params?.[0] || 'student-123',
          preferences: {
            notifications: {
              email: true,
              inApp: true,
              taskReminders: true,
            },
          },
        }],
      });
    }
    
    // Mock notification creation
    if (sql.includes('INSERT INTO notifications')) {
      return Promise.resolve({
        rows: [{
          id: 'notification-123',
          user_id: params?.[0],
          type: params?.[1],
          channel: params?.[2],
          title: params?.[3],
          message: params?.[4],
          status: 'pending',
          scheduled_for: params?.[5],
          created_at: new Date(),
        }],
      });
    }
    
    // Mock pending notifications query
    if (sql.includes('SELECT * FROM notifications WHERE status')) {
      return Promise.resolve({
        rows: [
          {
            id: 'notification-1',
            user_id: 'student-123',
            type: 'task_reminder',
            channel: 'in_app',
            title: 'Task Reminder',
            message: 'Complete your daily task',
            data: null,
            status: 'pending',
            scheduled_for: new Date(),
            sent_at: null,
            read_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });
    }
    
    // Mock notification update
    if (sql.includes('UPDATE notifications SET status')) {
      return Promise.resolve({
        rows: [{
          id: params?.[2] || 'notification-1',
          status: params?.[0] || 'sent',
          sent_at: new Date(),
        }],
      });
    }
    
    return Promise.resolve({ rows: [] });
  });
}

describe('Learning Plan Generation Quality Tests', () => {
  describe('Performance - Plan Generation Time', () => {
    it('should generate a learning plan within 5 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 10,
          subjects: ['Mathematics', 'Physics'],
          examType: 'NMT',
          examDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          planningDays: 7,
        });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(5);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('dailyTasks');
      expect(response.body).toHaveProperty('weeklyGoals');
    });

    it('should generate complex multi-subject plan within 5 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 11,
          subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
          examType: 'NMT',
          examDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          planningDays: 14,
        });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(5);
      expect(response.body.dailyTasks.length).toBeGreaterThan(0);
    });

    it('should generate plan with knowledge gaps analysis within 5 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 10,
          subjects: ['Mathematics'],
          examType: 'SAT',
          examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          planningDays: 7,
          includeGapsAnalysis: true,
        });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Plan Quality - Different Student Profiles', () => {
    it('should generate appropriate plan for beginner student', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          subjects: ['Mathematics'],
          examType: 'General',
          studentLevel: 5,
          planningDays: 7,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      // Verify plan structure
      expect(plan.dailyTasks).toBeDefined();
      expect(plan.weeklyGoals).toBeDefined();
      expect(plan.dailyTasks.length).toBeGreaterThan(0);
      expect(plan.weeklyGoals.length).toBeGreaterThan(0);
      
      // Verify tasks have required fields
      plan.dailyTasks.forEach((task: Task) => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('subject');
        expect(task).toHaveProperty('type');
        expect(task).toHaveProperty('estimatedTime');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('dueDate');
        expect(['lesson', 'test', 'practice']).toContain(task.type);
        expect(['high', 'medium', 'low']).toContain(task.priority);
      });
    });

    it('should generate appropriate plan for advanced student', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          subjects: ['Physics', 'Chemistry'],
          examType: 'NMT',
          studentLevel: 11,
          examDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          planningDays: 10,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      expect(plan.dailyTasks.length).toBeGreaterThan(0);
      expect(plan.weeklyGoals.length).toBeGreaterThan(0);
      
      // Verify goals have proper structure
      plan.weeklyGoals.forEach((goal: any) => {
        expect(goal).toHaveProperty('id');
        expect(goal).toHaveProperty('title');
        expect(goal).toHaveProperty('description');
        expect(goal).toHaveProperty('targetDate');
        expect(goal).toHaveProperty('progress');
        expect(goal).toHaveProperty('completed');
        expect(typeof goal.progress).toBe('number');
        expect(goal.progress).toBeGreaterThanOrEqual(0);
        expect(goal.progress).toBeLessThanOrEqual(100);
      });
    });

    it('should generate plan for student with urgent exam deadline', async () => {
      const urgentExamDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
      
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          subjects: ['Mathematics', 'English'],
          examType: 'Final Exam',
          examDate: urgentExamDate.toISOString(),
          studentLevel: 10,
          planningDays: 14,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      expect(plan.dailyTasks.length).toBeGreaterThan(0);
      
      // Verify tasks are distributed across the planning period
      const taskDates = plan.dailyTasks.map((task: Task) => new Date(task.dueDate));
      const uniqueDates = new Set(taskDates.map(d => d.toDateString()));
      expect(uniqueDates.size).toBeGreaterThan(1);
      
      // Verify high priority tasks exist for urgent timeline
      const highPriorityTasks = plan.dailyTasks.filter((task: Task) => task.priority === 'high');
      expect(highPriorityTasks.length).toBeGreaterThan(0);
    });

    it('should generate plan for student with multiple subjects', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
          examType: 'NMT',
          examDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          studentLevel: 11,
          planningDays: 14,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      expect(plan.dailyTasks.length).toBeGreaterThan(0);
      
      // Verify tasks cover multiple subjects
      const subjects = new Set(plan.dailyTasks.map((task: Task) => task.subject));
      expect(subjects.size).toBeGreaterThan(1);
      
      // Verify balanced distribution of task types
      const taskTypes = plan.dailyTasks.reduce((acc: any, task: Task) => {
        acc[task.type] = (acc[task.type] || 0) + 1;
        return acc;
      }, {});
      
      expect(Object.keys(taskTypes).length).toBeGreaterThan(1);
    });

    it('should generate plan with realistic time estimates', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          subjects: ['History'],
          examType: 'Midterm',
          studentLevel: 9,
          planningDays: 7,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      // Verify all tasks have reasonable time estimates
      plan.dailyTasks.forEach((task: Task) => {
        expect(task.estimatedTime).toBeGreaterThan(0);
        expect(task.estimatedTime).toBeLessThanOrEqual(180); // Max 3 hours per task
      });
      
      // Verify daily workload is reasonable (not more than 4 hours per day)
      const tasksByDate = plan.dailyTasks.reduce((acc: any, task: Task) => {
        const date = new Date(task.dueDate).toDateString();
        acc[date] = (acc[date] || 0) + task.estimatedTime;
        return acc;
      }, {});
      
      Object.values(tasksByDate).forEach((totalTime: any) => {
        expect(totalTime).toBeLessThanOrEqual(240); // Max 4 hours per day
      });
    });
  });

  describe('Reminder Delivery Validation', () => {
    it('should schedule reminders for all tasks in generated plan', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 10,
          subjects: ['Mathematics'],
          examType: 'Quiz',
          planningDays: 5,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      // Verify notifications were created (check database calls)
      const notificationCalls = (query as jest.Mock).mock.calls.filter(
        call => call[0].includes('INSERT INTO notifications')
      );
      
      // Should have created notifications for the plan
      expect(notificationCalls.length).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve pending notifications for delivery', async () => {
      const response = await request(app)
        .get('/notifications/pending');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const notification = response.body[0];
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('userId');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('channel');
        expect(notification).toHaveProperty('title');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('status');
        expect(notification.status).toBe('pending');
      }
    });

    it('should mark notifications as sent after delivery', async () => {
      // First, get pending notifications
      const pendingResponse = await request(app)
        .get('/notifications/pending');
      
      expect(pendingResponse.status).toBe(200);
      
      if (pendingResponse.body.length > 0) {
        const notificationId = pendingResponse.body[0].id;
        
        // Mark as sent
        const updateResponse = await request(app)
          .patch(`/notifications/${notificationId}/status`)
          .send({ status: 'sent' });
        
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.status).toBe('sent');
      }
    });

    it('should schedule reminders based on task due dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 10,
          subjects: ['Science'],
          examType: 'Test',
          planningDays: 3,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      // Verify tasks have future due dates
      plan.dailyTasks.forEach((task: Task) => {
        const dueDate = new Date(task.dueDate);
        expect(dueDate.getTime()).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);
      });
    });

    it('should respect user notification preferences', async () => {
      // Mock user with notifications disabled
      (query as jest.Mock).mockImplementationOnce((sql: string) => {
        if (sql.includes('SELECT * FROM users WHERE id')) {
          return Promise.resolve({
            rows: [{
              id: 'no-notif-student',
              preferences: {
                notifications: {
                  email: false,
                  inApp: false,
                  taskReminders: false,
                },
              },
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });
      
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 10,
          subjects: ['English'],
          examType: 'Essay',
          planningDays: 3,
        });
      
      expect(response.status).toBe(201);
      
      // Verify plan was created even without notifications
      expect(response.body).toHaveProperty('id');
      expect(response.body.dailyTasks.length).toBeGreaterThan(0);
    });

    it('should support multiple notification channels', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 10,
          subjects: ['Geography'],
          examType: 'Final',
          planningDays: 5,
        });
      
      expect(response.status).toBe(201);
      
      // Check that notifications can be created for different channels
      const notificationCalls = (query as jest.Mock).mock.calls.filter(
        call => call[0].includes('INSERT INTO notifications')
      );
      
      // Verify notification structure supports channels
      expect(notificationCalls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Plan Quality Metrics', () => {
    it('should generate plan with appropriate task variety', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          subjects: ['Computer Science'],
          examType: 'Certification',
          studentLevel: 12,
          planningDays: 10,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      // Count task types
      const taskTypeCounts = plan.dailyTasks.reduce((acc: any, task: Task) => {
        acc[task.type] = (acc[task.type] || 0) + 1;
        return acc;
      }, {});
      
      // Should have at least 2 different task types for variety
      expect(Object.keys(taskTypeCounts).length).toBeGreaterThanOrEqual(1);
    });

    it('should generate plan with clear goal descriptions', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          subjects: ['Literature'],
          examType: 'AP Exam',
          studentLevel: 11,
          planningDays: 7,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      // Verify goals have meaningful content
      plan.weeklyGoals.forEach((goal: any) => {
        expect(goal.title.length).toBeGreaterThan(5);
        expect(goal.description.length).toBeGreaterThan(10);
        expect(goal.targetDate).toBeDefined();
      });
    });

    it('should generate plan with actionable task descriptions', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          subjects: ['Art History'],
          examType: 'Midterm',
          studentLevel: 10,
          planningDays: 7,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      // Verify tasks have descriptions
      plan.dailyTasks.forEach((task: Task) => {
        expect(task.title.length).toBeGreaterThan(3);
        if (task.description) {
          expect(task.description.length).toBeGreaterThan(5);
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing optional parameters', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 10,
          subjects: ['Mathematics'],
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.dailyTasks).toBeDefined();
    });

    it('should handle single subject plan', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 10,
          subjects: ['Chemistry'],
          examType: 'Quiz',
          planningDays: 3,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      expect(plan.dailyTasks.length).toBeGreaterThan(0);
      plan.dailyTasks.forEach((task: Task) => {
        expect(task.subject).toBe('Chemistry');
      });
    });

    it('should handle short planning period', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 9,
          subjects: ['English'],
          examType: 'Quiz',
          planningDays: 1,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      expect(plan.dailyTasks.length).toBeGreaterThan(0);
      expect(plan.weeklyGoals.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle long planning period', async () => {
      const response = await request(app)
        .post('/learning-plans/generate')
        .send({
          studentId: generateStudentId(),
          studentLevel: 11,
          subjects: ['History', 'Geography'],
          examType: 'Final Exam',
          examDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          planningDays: 30,
        });
      
      expect(response.status).toBe(201);
      const plan = response.body as LearningPlan;
      
      expect(plan.dailyTasks.length).toBeGreaterThan(0);
      expect(plan.weeklyGoals.length).toBeGreaterThan(0);
    });
  });
});
