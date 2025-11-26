import { AnalyticsSnapshotModel } from '../models/AnalyticsSnapshot';
import { StudentActivityModel } from '../models/StudentActivity';
import { query } from '../db/connection';
import { SubjectScore } from '@ai-tutor/shared-types';

export class SnapshotService {
  /**
   * Generate daily snapshot for a student
   */
  static async generateDailySnapshot(studentId: string, date: Date = new Date()): Promise<void> {
    try {
      // Normalize date to start of day
      const snapshotDate = new Date(date);
      snapshotDate.setHours(0, 0, 0, 0);

      // Get date range for the snapshot
      const startDate = new Date(snapshotDate);
      const endDate = new Date(snapshotDate);
      endDate.setDate(endDate.getDate() + 1);

      // Get activities for the day
      const activities = await StudentActivityModel.findByStudentAndDateRange(
        studentId,
        startDate,
        endDate
      );

      // Calculate metrics
      const testsCompleted = activities.filter(a => a.activityType === 'test_completed').length;
      const studyTime = activities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
      
      // Calculate overall score
      const scoredActivities = activities.filter(a => a.score !== null && a.score !== undefined);
      const overallScore = scoredActivities.length > 0
        ? scoredActivities.reduce((sum, a) => sum + a.score!, 0) / scoredActivities.length
        : 0;

      // Calculate subject scores
      const subjectScores = await this.calculateSubjectScores(studentId, startDate, endDate);

      // Calculate improvement rate (compare to previous period)
      const improvementRate = await this.calculateImprovementRate(studentId, snapshotDate);

      // Calculate consistency (study regularity)
      const consistency = await this.calculateConsistency(studentId, snapshotDate);

      // Create or update snapshot
      await AnalyticsSnapshotModel.create({
        studentId,
        snapshotDate,
        overallScore,
        subjectScores,
        testsCompleted,
        studyTime,
        improvementRate,
        consistency
      });

      console.log(`Generated daily snapshot for student ${studentId} on ${snapshotDate.toISOString()}`);
    } catch (error) {
      console.error('Error generating daily snapshot:', error);
      throw error;
    }
  }

  /**
   * Generate snapshots for all active students
   */
  static async generateAllSnapshots(date: Date = new Date()): Promise<void> {
    try {
      // Get all students who had activity in the last 30 days
      const result = await query(
        `SELECT DISTINCT student_id 
         FROM student_activities 
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
      );

      const studentIds = result.rows.map(row => row.student_id);

      console.log(`Generating snapshots for ${studentIds.length} students...`);

      // Generate snapshots in parallel (batches of 10)
      const batchSize = 10;
      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batch = studentIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(studentId => this.generateDailySnapshot(studentId, date))
        );
      }

      console.log('All snapshots generated successfully');
    } catch (error) {
      console.error('Error generating all snapshots:', error);
      throw error;
    }
  }

  /**
   * Calculate subject-specific scores
   */
  private static async calculateSubjectScores(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SubjectScore[]> {
    const result = await query(
      `SELECT 
         subject,
         AVG(score) as avg_score,
         COUNT(*) as tests_count
       FROM student_activities
       WHERE student_id = $1
       AND created_at BETWEEN $2 AND $3
       AND activity_type = 'test_completed'
       AND subject IS NOT NULL
       AND score IS NOT NULL
       GROUP BY subject`,
      [studentId, startDate, endDate]
    );

    const subjectScores: SubjectScore[] = [];

    for (const row of result.rows) {
      const trend = await this.calculateSubjectTrend(studentId, row.subject, startDate);
      
      subjectScores.push({
        subject: row.subject,
        score: parseFloat(row.avg_score),
        testsCompleted: parseInt(row.tests_count),
        trend
      });
    }

    return subjectScores;
  }

  /**
   * Calculate subject trend (improving/stable/declining)
   */
  private static async calculateSubjectTrend(
    studentId: string,
    subject: string,
    currentDate: Date
  ): Promise<'improving' | 'stable' | 'declining'> {
    // Compare current period to previous period
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 7);

    const result = await query(
      `SELECT 
         CASE 
           WHEN created_at >= $3 THEN 'current'
           ELSE 'previous'
         END as period,
         AVG(score) as avg_score
       FROM student_activities
       WHERE student_id = $1
       AND subject = $2
       AND activity_type = 'test_completed'
       AND score IS NOT NULL
       AND created_at >= $4
       GROUP BY period`,
      [studentId, subject, currentDate, previousDate]
    );

    const scores = result.rows.reduce((acc, row) => {
      acc[row.period] = parseFloat(row.avg_score);
      return acc;
    }, {} as Record<string, number>);

    if (!scores.current || !scores.previous) {
      return 'stable';
    }

    const difference = scores.current - scores.previous;
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Calculate improvement rate
   */
  private static async calculateImprovementRate(
    studentId: string,
    currentDate: Date
  ): Promise<number> {
    // Get current snapshot
    const current = await AnalyticsSnapshotModel.findByStudentAndDate(studentId, currentDate);
    
    // Get snapshot from 7 days ago
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 7);
    const previous = await AnalyticsSnapshotModel.findByStudentAndDate(studentId, previousDate);

    if (!current || !previous || previous.overallScore === 0) {
      return 0;
    }

    return ((current.overallScore - previous.overallScore) / previous.overallScore) * 100;
  }

  /**
   * Calculate study consistency (0-100)
   */
  private static async calculateConsistency(
    studentId: string,
    currentDate: Date
  ): Promise<number> {
    // Check study activity over last 7 days
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 7);

    const result = await query(
      `SELECT 
         DATE(created_at) as study_date,
         COUNT(*) as activity_count
       FROM student_activities
       WHERE student_id = $1
       AND created_at BETWEEN $2 AND $3
       GROUP BY DATE(created_at)`,
      [studentId, startDate, currentDate]
    );

    const daysWithActivity = result.rows.length;
    const consistency = (daysWithActivity / 7) * 100;

    return Math.round(consistency);
  }
}
