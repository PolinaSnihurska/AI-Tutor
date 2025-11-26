import { ReminderService } from './reminderService';
import { LearningPlanModel } from '../models/LearningPlan';

export class ScheduledJobsService {
  private reminderService: ReminderService;
  private processingInterval: NodeJS.Timeout | null = null;
  private dailySummaryInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.reminderService = new ReminderService();
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    console.log('[ScheduledJobs] Starting scheduled jobs...');
    
    // Process pending notifications every minute
    this.processingInterval = setInterval(async () => {
      try {
        await this.reminderService.processPendingNotifications();
      } catch (error) {
        console.error('[ScheduledJobs] Error processing notifications:', error);
      }
    }, 60 * 1000); // Every 1 minute

    // Schedule daily summaries every hour (checks if needed)
    this.dailySummaryInterval = setInterval(async () => {
      try {
        await this.scheduleDailySummaries();
      } catch (error) {
        console.error('[ScheduledJobs] Error scheduling daily summaries:', error);
      }
    }, 60 * 60 * 1000); // Every 1 hour

    console.log('[ScheduledJobs] Scheduled jobs started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log('[ScheduledJobs] Stopping scheduled jobs...');
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.dailySummaryInterval) {
      clearInterval(this.dailySummaryInterval);
      this.dailySummaryInterval = null;
    }

    console.log('[ScheduledJobs] Scheduled jobs stopped');
  }

  /**
   * Schedule daily summaries for all active users
   */
  private async scheduleDailySummaries(): Promise<void> {
    // This would typically query for all active users
    // For now, it's a placeholder that would be called by a cron job
    console.log('[ScheduledJobs] Checking for daily summaries to schedule...');
  }

  /**
   * Manually trigger notification processing (for testing)
   */
  async triggerNotificationProcessing(): Promise<void> {
    await this.reminderService.processPendingNotifications();
  }
}

// Singleton instance
let scheduledJobsInstance: ScheduledJobsService | null = null;

export function getScheduledJobsService(): ScheduledJobsService {
  if (!scheduledJobsInstance) {
    scheduledJobsInstance = new ScheduledJobsService();
  }
  return scheduledJobsInstance;
}
