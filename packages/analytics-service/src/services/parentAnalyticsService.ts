import { ParentAnalytics, TimeMetrics, GoalComparison, SubjectScore, DateRange } from '@ai-tutor/shared-types';
import { ProgressCalculationService } from './progressCalculationService';
import { HeatmapService } from './heatmapService';
import { StudentActivityModel } from '../models/StudentActivity';
import { query } from '../db/connection';

export class ParentAnalyticsService {
  /**
   * Get comprehensive analytics for a child from parent's perspective
   */
  static async getChildAnalytics(
    childId: string,
    period: DateRange
  ): Promise<ParentAnalytics> {
    try {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      // Get study time metrics
      const studyTime = await this.getStudyTimeMetrics(childId, startDate, endDate);

      // Get performance by subject
      const performanceBySubject = await this.getPerformanceBySubject(childId, startDate, endDate);

      // Get weak topics
      const weakTopics = await this.getWeakTopics(childId);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        childId,
        performanceBySubject,
        weakTopics,
        studyTime
      );

      // Get goal comparison
      const comparisonToGoals = await this.getGoalComparison(childId);

      return {
        childId,
        period,
        studyTime,
        performanceBySubject,
        weakTopics,
        recommendations,
        comparisonToGoals
      };
    } catch (error) {
      console.error('Error getting child analytics:', error);
      throw error;
    }
  }

  /**
   * Get study time metrics for a child
   */
  private static async getStudyTimeMetrics(
    childId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeMetrics> {
    // Get daily study time
    const studyDays = await StudentActivityModel.getStudyTimeByDate(
      childId,
      startDate,
      endDate
    );

    const totalMinutes = studyDays.reduce((sum, day) => sum + day.minutes, 0);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

    // Calculate weekly trend (last 7 days)
    const weeklyTrend: number[] = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayStudy = studyDays.find(d => {
        const studyDate = new Date(d.date);
        studyDate.setHours(0, 0, 0, 0);
        return studyDate.getTime() === date.getTime();
      });
      
      weeklyTrend.push(dayStudy ? dayStudy.minutes : 0);
    }

    return {
      totalMinutes,
      dailyAverage,
      weeklyTrend
    };
  }

  /**
   * Get performance by subject for a child
   */
  private static async getPerformanceBySubject(
    childId: string,
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
       ORDER BY avg_score ASC`,
      [childId, startDate, endDate]
    );

    const subjectScores: SubjectScore[] = [];

    for (const row of result.rows) {
      const trend = await this.calculateSubjectTrend(childId, row.subject, startDate, endDate);
      
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
   * Calculate subject trend
   */
  private static async calculateSubjectTrend(
    childId: string,
    subject: string,
    startDate: Date,
    endDate: Date
  ): Promise<'improving' | 'stable' | 'declining'> {
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
      [childId, subject, startDate, midDate, endDate]
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
   * Get weak topics for a child
   */
  private static async getWeakTopics(childId: string): Promise<string[]> {
    const heatmap = await HeatmapService.generateHeatmap(childId);
    
    const weakTopics: Array<{ topic: string; errorRate: number }> = [];
    
    for (const subject of heatmap.subjects) {
      for (const topic of subject.topics) {
        if (topic.errorRate > 40) { // More than 40% error rate
          weakTopics.push({
            topic: `${subject.subject}: ${topic.topic}`,
            errorRate: topic.errorRate
          });
        }
      }
    }

    // Sort by error rate and return top 5
    return weakTopics
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5)
      .map(t => t.topic);
  }

  /**
   * Generate recommendations for parents
   */
  private static async generateRecommendations(
    childId: string,
    performanceBySubject: SubjectScore[],
    weakTopics: string[],
    studyTime: TimeMetrics
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Study time recommendations
    if (studyTime.dailyAverage < 30) {
      recommendations.push('Encourage more daily study time. Current average is below recommended 30 minutes per day.');
    } else if (studyTime.dailyAverage > 120) {
      recommendations.push('Consider breaks to avoid burnout. Current study time is very high.');
    }

    // Check for declining trend in weekly study
    const recentDays = studyTime.weeklyTrend.slice(-3);
    const earlierDays = studyTime.weeklyTrend.slice(0, 3);
    const recentAvg = recentDays.reduce((a, b) => a + b, 0) / recentDays.length;
    const earlierAvg = earlierDays.reduce((a, b) => a + b, 0) / earlierDays.length;
    
    if (recentAvg < earlierAvg * 0.7) {
      recommendations.push('Study time has decreased recently. Check if your child needs additional motivation or support.');
    }

    // Performance recommendations
    const lowPerformingSubjects = performanceBySubject.filter(s => s.score < 60);
    if (lowPerformingSubjects.length > 0) {
      const subjects = lowPerformingSubjects.map(s => s.subject).join(', ');
      recommendations.push(`Focus on improving performance in: ${subjects}. Consider additional tutoring or practice.`);
    }

    // Declining subjects
    const decliningSubjects = performanceBySubject.filter(s => s.trend === 'declining');
    if (decliningSubjects.length > 0) {
      const subjects = decliningSubjects.map(s => s.subject).join(', ');
      recommendations.push(`Performance is declining in: ${subjects}. Immediate attention needed.`);
    }

    // Weak topics recommendations
    if (weakTopics.length > 0) {
      recommendations.push(`Priority topics needing attention: ${weakTopics.slice(0, 3).join(', ')}`);
    }

    // Positive reinforcement
    const improvingSubjects = performanceBySubject.filter(s => s.trend === 'improving');
    if (improvingSubjects.length > 0) {
      const subjects = improvingSubjects.map(s => s.subject).join(', ');
      recommendations.push(`Great progress in: ${subjects}. Keep up the good work!`);
    }

    // If no specific recommendations, provide general encouragement
    if (recommendations.length === 0) {
      recommendations.push('Your child is making steady progress. Continue with the current study routine.');
    }

    return recommendations;
  }

  /**
   * Get goal comparison for a child
   */
  private static async getGoalComparison(childId: string): Promise<GoalComparison> {
    // Get learning plan with exam target
    const planResult = await query(
      `SELECT exam_date, subjects FROM learning_plans 
       WHERE student_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [childId]
    );

    // Get current performance
    const progress = await ProgressCalculationService.calculateProgress(
      childId,
      {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      }
    );

    const currentScore = progress.overallScore;
    
    // Default target score (can be customized per student)
    const targetScore = 80;

    let daysRemaining = 0;
    if (planResult.rows.length > 0 && planResult.rows[0].exam_date) {
      const examDate = new Date(planResult.rows[0].exam_date);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Determine if on track based on current score and time remaining
    const scoreGap = targetScore - currentScore;
    const requiredDailyImprovement = daysRemaining > 0 ? scoreGap / daysRemaining : 0;
    const onTrack = currentScore >= targetScore || (requiredDailyImprovement <= 0.5 && daysRemaining > 30);

    return {
      targetScore,
      currentScore,
      onTrack,
      daysRemaining
    };
  }

  /**
   * Get aggregated analytics for multiple children
   */
  static async getAggregatedAnalytics(
    childIds: string[],
    period: DateRange
  ): Promise<{
    totalStudyTime: number;
    averagePerformance: number;
    childrenNeedingAttention: string[];
  }> {
    const analytics = await Promise.all(
      childIds.map(childId => this.getChildAnalytics(childId, period))
    );

    const totalStudyTime = analytics.reduce((sum, a) => sum + a.studyTime.totalMinutes, 0);
    
    const averagePerformance = analytics.reduce((sum, a) => {
      const avgScore = a.performanceBySubject.reduce((s, p) => s + p.score, 0) / 
                      (a.performanceBySubject.length || 1);
      return sum + avgScore;
    }, 0) / (analytics.length || 1);

    const childrenNeedingAttention = analytics
      .filter(a => !a.comparisonToGoals.onTrack || a.weakTopics.length > 3)
      .map(a => a.childId);

    return {
      totalStudyTime: Math.round(totalStudyTime),
      averagePerformance: Math.round(averagePerformance),
      childrenNeedingAttention
    };
  }
}
