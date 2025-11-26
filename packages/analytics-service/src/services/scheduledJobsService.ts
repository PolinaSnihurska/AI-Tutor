import cron from 'node-cron';
import { SnapshotService } from './snapshotService';

export class ScheduledJobsService {
  private static jobs: cron.ScheduledTask[] = [];

  /**
   * Start all scheduled jobs
   */
  static start(): void {
    console.log('Starting scheduled jobs...');

    // Generate daily snapshots at midnight
    const snapshotJob = cron.schedule('0 0 * * *', async () => {
      console.log('Running daily snapshot generation...');
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await SnapshotService.generateAllSnapshots(yesterday);
      } catch (error) {
        console.error('Error in snapshot generation job:', error);
      }
    });

    this.jobs.push(snapshotJob);
    console.log('Scheduled jobs started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  static stop(): void {
    console.log('Stopping scheduled jobs...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('Scheduled jobs stopped');
  }

  /**
   * Manually trigger snapshot generation (for testing)
   */
  static async triggerSnapshotGeneration(date?: Date): Promise<void> {
    console.log('Manually triggering snapshot generation...');
    await SnapshotService.generateAllSnapshots(date);
  }
}
