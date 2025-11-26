import { AnalyticsSnapshotModel } from '../models/AnalyticsSnapshot';
import { StudentActivityModel } from '../models/StudentActivity';
import { Progress, SubjectScore, DateRange } from '@ai-tutor/shared-types';
import { query } from '../db/connection';

export class ProgressCalculationService {
  /**
   * Calculate comprehensive progress for a student over a period
   */
  static async calculateProgress(studentId: string, period: DateRange): Promise<Progress> {
    try {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      // Get snapshots for the period
      const snapshots = await AnalyticsSnapshotModel.findByStudentAndDateRange(
        studentId,
        startDate,
        endDate
      );

      // Calculate overall score (average of all snapshots)
      const overallScore = this.calculateOverallScore(snapshots);

      // Calculate subject-specific scores
      const subjectScores = await this.calculateSubjectScores(studentId, startDate, endDate);

      // Get total tests completed
      const testsCompleted = snapshots.reduce((sum, s) => sum + s.testsCompleted, 0);

      // Get total study time
      const studyTime = snapshots.reduce((sum, s) => sum + s.studyTime, 0);

      // Calculate improvement rate
      const improvementRate = this.calculateImprovementRate(snapshots);

      // Calculate consistency
      const consistency = await this.calculateConsistency(studentId, startDate, endDate);

      return {
        studentId,
        period,
        overallScore,
        subjectScores,
        testsCompleted,
        studyTime,
        improvementRate,
        consistency
      };
    } catch (error) {
      console.error('Error calculating progress:', error);
      throw error;
    }
  }

  /**
   * Calculate overall score from snapshots
   */
  private static calculateOverallScore(snapshots: any[]): number {
    if (snapshots.length === 0) return 0;

    const validScores = snapshots
      .filter(s => s.overallScore > 0)
      .map(s => s.overallScore);

    if (validScores.length === 0) return 0;

    // Weight recent scores more heavily
    let weightedSum = 0;
    let totalWeight = 0;

    validScores.forEach((score, index) => {
      const weight = index + 1; // More recent = higher weight
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate subject-specific performance metrics
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
       GROUP BY subject
       ORDER BY subject`,
      [studentId, startDate, endDate]
    );

    const subjectScores: SubjectScore[] = [];

    for (const row of result.rows) {
      const trend = await this.calculateSubjectTrend(studentId, row.subject, startDate, endDate);
      
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
   * Calculate subject trend over the period
   */
  private static async calculateSubjectTrend(
    studentId: string,
    subject: string,
    startDate: Date,
    endDate: Date
  ): Promise<'improving' | 'stable' | 'declining'> {
    // Split period in half and compare
    const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);

    const result = await query(
      `SELECT 
         CASE 
           WHEN created_at >= $4 THEN 'recent'
           ELSE 'earlier'
         END as period,
         AVG(score) as avg_score
       FROM student_activities
       WHERE student_id = $1
       AND subject = $2
       AND activity_type = 'test_completed'
       AND score IS NOT NULL
       AND created_at BETWEEN $3 AND $5
       GROUP BY period`,
      [studentId, subject, startDate, midDate, endDate]
    );

    const scores = result.rows.reduce((acc, row) => {
      acc[row.period] = parseFloat(row.avg_score);
      return acc;
    }, {} as Record<string, number>);

    if (!scores.recent || !scores.earlier) {
      return 'stable';
    }

    const difference = scores.recent - scores.earlier;
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Calculate improvement rate over the period
   */
  private static calculateImprovementRate(snapshots: any[]): number {
    if (snapshots.length < 2) return 0;

    // Compare first and last snapshots
    const firstSnapshot = snapshots[snapshots.length - 1]; // Oldest
    const lastSnapshot = snapshots[0]; // Most recent

    if (firstSnapshot.overallScore === 0) return 0;

    const improvement = ((lastSnapshot.overallScore - firstSnapshot.overallScore) / firstSnapshot.overallScore) * 100;
    return Math.round(improvement * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate study consistency metrics (0-100)
   */
  private static async calculateConsistency(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Get study time by date
    const studyDays = await StudentActivityModel.getStudyTimeByDate(
      studentId,
      startDate,
      endDate
    );

    if (studyDays.length === 0) return 0;

    // Calculate total days in period
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate consistency based on:
    // 1. Percentage of days with activity (50% weight)
    // 2. Regularity of study time (50% weight)
    
    const daysWithActivity = studyDays.length;
    const activityPercentage = (daysWithActivity / totalDays) * 100;

    // Calculate standard deviation of study time (lower = more consistent)
    const avgStudyTime = studyDays.reduce((sum, d) => sum + d.minutes, 0) / studyDays.length;
    const variance = studyDays.reduce((sum, d) => sum + Math.pow(d.minutes - avgStudyTime, 2), 0) / studyDays.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize standard deviation to 0-100 scale (lower stdDev = higher consistency)
    const regularityScore = Math.max(0, 100 - (stdDev / avgStudyTime) * 100);

    // Combine scores
    const consistency = (activityPercentage * 0.5) + (regularityScore * 0.5);

    return Math.round(consistency);
  }

  /**
   * Get performance trends over time
   */
  static async getPerformanceTrends(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    dates: string[];
    overallScores: number[];
    studyTimes: number[];
    testsCompleted: number[];
  }> {
    const snapshots = await AnalyticsSnapshotModel.findByStudentAndDateRange(
      studentId,
      startDate,
      endDate
    );

    return {
      dates: snapshots.map(s => s.snapshotDate.toISOString().split('T')[0]),
      overallScores: snapshots.map(s => s.overallScore),
      studyTimes: snapshots.map(s => s.studyTime),
      testsCompleted: snapshots.map(s => s.testsCompleted)
    };
  }
}
