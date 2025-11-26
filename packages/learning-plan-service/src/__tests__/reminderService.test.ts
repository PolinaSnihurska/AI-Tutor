import { ReminderService } from '../services/reminderService';
import { NotificationService } from '../services/notificationService';
import { UserActivityService } from '../services/userActivityService';
import { Task } from '@ai-tutor/shared-types';

// Mock the database query function
jest.mock('../db/connection', () => ({
  query: jest.fn(),
}));

describe('ReminderService', () => {
  let reminderService: ReminderService;
  let notificationService: NotificationService;
  let activityService: UserActivityService;

  beforeEach(() => {
    reminderService = new ReminderService();
    notificationService = new NotificationService();
    activityService = new UserActivityService();
    jest.clearAllMocks();
  });

  describe('scheduleTaskReminder', () => {
    it('should schedule a reminder for a task', async () => {
      const userId = 'test-user-id';
      const task: Task = {
        id: 'task-1',
        title: 'Complete Math Homework',
        subject: 'Mathematics',
        type: 'practice',
        estimatedTime: 30,
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      };

      // Mock user preferences
      const { query } = require('../db/connection');
      query.mockResolvedValueOnce({
        rows: [{
          preferences: {
            notifications: {
              email: true,
              inApp: true,
              taskReminders: true,
            }
          }
        }]
      });

      // Mock activity pattern query
      query.mockResolvedValueOnce({
        rows: []
      });

      // Mock notification creation
      query.mockResolvedValueOnce({
        rows: [{
          id: 'notification-1',
          user_id: userId,
          type: 'task_reminder',
          channel: 'in_app',
          title: `Reminder: ${task.title}`,
          message: 'Test message',
          status: 'pending',
          scheduled_for: new Date(),
          created_at: new Date(),
        }]
      });

      await reminderService.scheduleTaskReminder(userId, task);

      // Verify notification was created
      expect(query).toHaveBeenCalled();
    });
  });

  describe('UserActivityService', () => {
    it('should record user login', async () => {
      const userId = 'test-user-id';
      const { query } = require('../db/connection');
      
      query.mockResolvedValueOnce({ rows: [] });

      await activityService.recordLogin(userId);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_activity'),
        expect.any(Array)
      );
    });

    it('should get user activity pattern', async () => {
      const userId = 'test-user-id';
      const { query } = require('../db/connection');
      
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            login_times: [new Date()],
            active_hours: [9, 14, 18],
            tasks_completed: 5,
            study_minutes: 120,
            last_activity: new Date(),
          }
        ]
      });

      const pattern = await activityService.getUserActivityPattern(userId);

      expect(pattern.userId).toBe(userId);
      expect(pattern.preferredHours).toBeDefined();
      expect(pattern.activityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('NotificationService', () => {
    it('should create a notification', async () => {
      const { query } = require('../db/connection');
      
      query.mockResolvedValueOnce({
        rows: [{
          id: 'notification-1',
          user_id: 'user-1',
          type: 'task_reminder',
          channel: 'in_app',
          title: 'Test Notification',
          message: 'Test message',
          data: null,
          status: 'pending',
          scheduled_for: new Date(),
          sent_at: null,
          read_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        }]
      });

      const notification = await notificationService.createNotification(
        'user-1',
        'task_reminder',
        'in_app',
        'Test Notification',
        'Test message',
        new Date()
      );

      expect(notification.id).toBe('notification-1');
      expect(notification.type).toBe('task_reminder');
      expect(notification.status).toBe('pending');
    });

    it('should get pending notifications', async () => {
      const { query } = require('../db/connection');
      
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'notification-1',
            user_id: 'user-1',
            type: 'task_reminder',
            channel: 'in_app',
            title: 'Test',
            message: 'Test',
            data: null,
            status: 'pending',
            scheduled_for: new Date(),
            sent_at: null,
            read_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        ]
      });

      const notifications = await notificationService.getPendingNotifications();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].status).toBe('pending');
    });
  });
});
