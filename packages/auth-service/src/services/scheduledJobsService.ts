import { query } from '../db/connection';
import cron from 'node-cron';
import { GDPRService } from './gdprService';
import { SessionManager } from '../utils/sessionManager';

/**
 * Service for managing scheduled jobs like daily resets and cleanup
 */
export class ScheduledJobsService {
  private static jobs: cron.ScheduledTask[] = [];

  /**
   * Start all scheduled jobs
   */
  static startAll(): void {
    console.log('Starting scheduled jobs...');
    
    // Clean up old usage tracking data daily at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      console.log('Running usage tracking cleanup job...');
      try {
        await this.cleanupOldUsageData();
        console.log('Usage tracking cleanup completed successfully');
      } catch (error) {
        console.error('Error during usage tracking cleanup:', error);
      }
    });
    
    // Process scheduled data deletions daily at 3 AM
    const deletionJob = cron.schedule('0 3 * * *', async () => {
      console.log('Running scheduled data deletions job...');
      try {
        const processed = await GDPRService.processScheduledDeletions();
        console.log(`Processed ${processed} scheduled data deletions`);
      } catch (error) {
        console.error('Error during scheduled deletions:', error);
      }
    });
    
    // Clean up expired sessions daily at 4 AM
    const sessionCleanupJob = cron.schedule('0 4 * * *', async () => {
      console.log('Running session cleanup job...');
      try {
        const cleaned = await SessionManager.cleanupExpiredSessions();
        console.log(`Cleaned up ${cleaned} expired sessions`);
      } catch (error) {
        console.error('Error during session cleanup:', error);
      }
    });
    
    this.jobs.push(cleanupJob, deletionJob, sessionCleanupJob);
    console.log('Scheduled jobs started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  static stopAll(): void {
    console.log('Stopping scheduled jobs...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('All scheduled jobs stopped');
  }

  /**
   * Clean up usage tracking data older than 90 days
   */
  private static async cleanupOldUsageData(): Promise<void> {
    const result = await query(
      `DELETE FROM usage_tracking
       WHERE date < CURRENT_DATE - INTERVAL '90 days'
       RETURNING id`
    );
    
    console.log(`Cleaned up ${result.rowCount} old usage tracking records`);
  }

  /**
   * Manually trigger cleanup (useful for testing)
   */
  static async triggerCleanup(): Promise<void> {
    await this.cleanupOldUsageData();
  }

  /**
   * Manually trigger GDPR deletions (useful for testing)
   */
  static async triggerGDPRDeletions(): Promise<number> {
    return await GDPRService.processScheduledDeletions();
  }

  /**
   * Manually trigger session cleanup (useful for testing)
   */
  static async triggerSessionCleanup(): Promise<number> {
    return await SessionManager.cleanupExpiredSessions();
  }
}
