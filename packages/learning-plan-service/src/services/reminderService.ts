import { NotificationService } from './notificationService';
import { UserActivityService } from './userActivityService';
import { LearningPlanModel } from '../models/LearningPlan';
import { Task, NotificationChannel } from '@ai-tutor/shared-types';
import { query } from '../db/connection';

export interface ReminderConfig {
  hoursBeforeDue: number;
  channels: NotificationChannel[];
}

export class ReminderService {
  private notificationService: NotificationService;
  private activityService: UserActivityService;

  constructor() {
    this.notificationService = new NotificationService();
    this.activityService = new UserActivityService();
  }

  /**
   * Schedule reminders for a task based on user activity patterns
   */
  async scheduleTaskReminder(
    userId: string,
    task: Task,
    config: ReminderConfig = { hoursBeforeDue: 2, channels: ['in_app', 'email'] }
  ): Promise<void> {
    // Get user's notification preferences
    const preferences = await this.getUserNotificationPreferences(userId);
    
    if (!preferences.taskReminders) {
      return; // User has disabled task reminders
    }

    // Get user activity pattern for intelligent scheduling
    const activityPattern = await this.activityService.getUserActivityPattern(userId);
    
    // Calculate optimal reminder time
    const reminderTime = this.calculateOptimalReminderTime(
      task.dueDate,
      activityPattern,
      config.hoursBeforeDue
    );

    // Don't schedule if reminder time is in the past
    if (reminderTime <= new Date()) {
      return;
    }

    // Create notifications for each enabled channel
    for (const channel of config.channels) {
      if (
        (channel === 'email' && preferences.email) ||
        (channel === 'in_app' && preferences.inApp)
      ) {
        await this.notificationService.createNotification(
          userId,
          'task_reminder',
          channel,
          `Reminder: ${task.title}`,
          this.generateTaskReminderMessage(task),
          reminderTime,
          {
            taskId: task.id,
            taskTitle: task.title,
            taskType: task.type,
            dueDate: task.dueDate.toISOString(),
            priority: task.priority,
          }
        );
      }
    }
  }

  /**
   * Schedule reminders for all pending tasks in a learning plan
   */
  async scheduleRemindersForPlan(planId: string): Promise<void> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) {
      return;
    }

    const pendingTasks = plan.dailyTasks.filter(
      task => task.status === 'pending' || task.status === 'in_progress'
    );

    for (const task of pendingTasks) {
      await this.scheduleTaskReminder(plan.studentId, task);
    }
  }

  /**
   * Schedule daily summary notification
   */
  async scheduleDailySummary(userId: string): Promise<void> {
    const preferences = await this.getUserNotificationPreferences(userId);
    
    if (!preferences.taskReminders) {
      return;
    }

    const activityPattern = await this.activityService.getUserActivityPattern(userId);
    
    // Schedule for evening (18:00) or user's most active hour
    const summaryTime = new Date();
    summaryTime.setDate(summaryTime.getDate());
    summaryTime.setHours(activityPattern.mostActiveHour || 18, 0, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (summaryTime <= new Date()) {
      summaryTime.setDate(summaryTime.getDate() + 1);
    }

    const plan = await LearningPlanModel.findActiveByStudentId(userId);
    if (!plan) {
      return;
    }

    const pendingTasks = plan.dailyTasks.filter(task => task.status === 'pending');
    const completedToday = plan.dailyTasks.filter(
      task => task.status === 'completed' && 
      new Date(task.dueDate).toDateString() === new Date().toDateString()
    );

    const message = `You have ${pendingTasks.length} pending tasks and completed ${completedToday.length} tasks today. Keep up the great work!`;

    if (preferences.inApp) {
      await this.notificationService.createNotification(
        userId,
        'daily_summary',
        'in_app',
        'Daily Learning Summary',
        message,
        summaryTime,
        {
          pendingTasks: pendingTasks.length,
          completedTasks: completedToday.length,
          completionRate: plan.completionRate,
        }
      );
    }
  }

  /**
   * Process pending notifications (should be called by a scheduled job)
   */
  async processPendingNotifications(): Promise<void> {
    const pendingNotifications = await this.notificationService.getPendingNotifications(100);
    
    for (const notification of pendingNotifications) {
      // Get user email for email notifications
      const userEmail = await this.getUserEmail(notification.userId);
      
      if (userEmail) {
        await this.notificationService.processNotification(notification, userEmail);
      } else {
        await this.notificationService.markAsFailed(notification.id);
      }
    }
  }

  /**
   * Calculate optimal reminder time based on user activity patterns
   */
  private calculateOptimalReminderTime(
    dueDate: Date,
    activityPattern: any,
    hoursBeforeDue: number
  ): Date {
    const reminderTime = new Date(dueDate);
    reminderTime.setHours(reminderTime.getHours() - hoursBeforeDue);

    // If user has activity patterns, adjust to their preferred time
    if (activityPattern.preferredHours.length > 0) {
      const targetHour = reminderTime.getHours();
      
      // Find closest preferred hour
      const closestHour = activityPattern.preferredHours.reduce((prev: number, curr: number) => {
        return Math.abs(curr - targetHour) < Math.abs(prev - targetHour) ? curr : prev;
      });

      reminderTime.setHours(closestHour, 0, 0, 0);
    }

    return reminderTime;
  }

  /**
   * Generate task reminder message
   */
  private generateTaskReminderMessage(task: Task): string {
    const timeUntilDue = task.dueDate.getTime() - new Date().getTime();
    const hoursUntilDue = Math.floor(timeUntilDue / (1000 * 60 * 60));
    
    let urgency = '';
    if (hoursUntilDue <= 2) {
      urgency = 'Due soon! ';
    } else if (hoursUntilDue <= 24) {
      urgency = 'Due today! ';
    }

    return `${urgency}Don't forget to complete "${task.title}" (${task.subject}). ` +
           `Estimated time: ${task.estimatedTime} minutes. ` +
           `Priority: ${task.priority}.`;
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<{
    email: boolean;
    inApp: boolean;
    taskReminders: boolean;
    weeklyReports: boolean;
  }> {
    const result = await query(
      'SELECT preferences FROM users WHERE id = $1',
      [userId]
    );

    const preferences = result.rows[0]?.preferences || {};
    const notifications = preferences.notifications || {};

    return {
      email: notifications.email !== false,
      inApp: notifications.inApp !== false,
      taskReminders: notifications.taskReminders !== false,
      weeklyReports: notifications.weeklyReports !== false,
    };
  }

  /**
   * Get user email
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    const result = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0]?.email || null;
  }

  /**
   * Cancel reminders for a task
   */
  async cancelTaskReminders(taskId: string): Promise<void> {
    await query(
      `UPDATE notifications 
       SET status = 'failed', updated_at = NOW()
       WHERE data->>'taskId' = $1 
       AND status = 'pending'`,
      [taskId]
    );
  }

  /**
   * Reschedule reminders for a task (when due date changes)
   */
  async rescheduleTaskReminders(userId: string, task: Task): Promise<void> {
    // Cancel existing reminders
    await this.cancelTaskReminders(task.id);
    
    // Schedule new reminders
    await this.scheduleTaskReminder(userId, task);
  }
}
