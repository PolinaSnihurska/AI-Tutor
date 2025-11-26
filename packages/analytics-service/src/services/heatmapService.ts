import { TopicPerformanceModel } from '../models/TopicPerformance';
import { Heatmap, SubjectHeatmap, TopicHeatmap } from '@ai-tutor/shared-types';

export class HeatmapService {
  /**
   * Generate comprehensive heatmap for a student
   */
  static async generateHeatmap(studentId: string): Promise<Heatmap> {
    try {
      // Update trends before generating heatmap
      await TopicPerformanceModel.updateTrends(studentId);

      // Get all topic performance data
      const topicPerformances = await TopicPerformanceModel.findByStudent(studentId);

      // Group by subject
      const subjectMap = new Map<string, TopicHeatmap[]>();

      for (const perf of topicPerformances) {
        if (!subjectMap.has(perf.subject)) {
          subjectMap.set(perf.subject, []);
        }

        const topicHeatmap: TopicHeatmap = {
          topic: perf.topic,
          errorRate: perf.errorRate,
          attemptsCount: perf.attemptsCount,
          lastAttempt: perf.lastAttemptAt || new Date(),
          trend: perf.trend || 'stable'
        };

        subjectMap.get(perf.subject)!.push(topicHeatmap);
      }

      // Convert to subject heatmaps
      const subjects: SubjectHeatmap[] = Array.from(subjectMap.entries()).map(([subject, topics]) => ({
        subject,
        topics: topics.sort((a, b) => b.errorRate - a.errorRate) // Sort by error rate descending
      }));

      return {
        studentId,
        subjects,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating heatmap:', error);
      throw error;
    }
  }

  /**
   * Generate heatmap for a specific subject
   */
  static async generateSubjectHeatmap(studentId: string, subject: string): Promise<SubjectHeatmap> {
    try {
      // Update trends before generating heatmap
      await TopicPerformanceModel.updateTrends(studentId);

      // Get topic performance for the subject
      const topicPerformances = await TopicPerformanceModel.findByStudentAndSubject(studentId, subject);

      const topics: TopicHeatmap[] = topicPerformances.map(perf => ({
        topic: perf.topic,
        errorRate: perf.errorRate,
        attemptsCount: perf.attemptsCount,
        lastAttempt: perf.lastAttemptAt || new Date(),
        trend: (perf.trend || 'stable') as 'improving' | 'stable' | 'declining'
      }));

      return {
        subject,
        topics: topics.sort((a, b) => b.errorRate - a.errorRate)
      };
    } catch (error) {
      console.error('Error generating subject heatmap:', error);
      throw error;
    }
  }

  /**
   * Get weak topics (high error rate) for a student
   */
  static async getWeakTopics(studentId: string, threshold: number = 50): Promise<TopicHeatmap[]> {
    try {
      const topicPerformances = await TopicPerformanceModel.findByStudent(studentId);

      const weakTopics: TopicHeatmap[] = topicPerformances
        .filter(perf => perf.errorRate >= threshold && perf.attemptsCount >= 3)
        .map(perf => ({
          topic: perf.topic,
          errorRate: perf.errorRate,
          attemptsCount: perf.attemptsCount,
          lastAttempt: perf.lastAttemptAt || new Date(),
          trend: perf.trend || 'stable'
        }))
        .sort((a, b) => b.errorRate - a.errorRate);

      return weakTopics;
    } catch (error) {
      console.error('Error getting weak topics:', error);
      throw error;
    }
  }

  /**
   * Get strong topics (low error rate) for a student
   */
  static async getStrongTopics(studentId: string, threshold: number = 20): Promise<TopicHeatmap[]> {
    try {
      const topicPerformances = await TopicPerformanceModel.findByStudent(studentId);

      const strongTopics: TopicHeatmap[] = topicPerformances
        .filter(perf => perf.errorRate <= threshold && perf.attemptsCount >= 3)
        .map(perf => ({
          topic: perf.topic,
          errorRate: perf.errorRate,
          attemptsCount: perf.attemptsCount,
          lastAttempt: perf.lastAttemptAt || new Date(),
          trend: perf.trend || 'stable'
        }))
        .sort((a, b) => a.errorRate - b.errorRate);

      return strongTopics;
    } catch (error) {
      console.error('Error getting strong topics:', error);
      throw error;
    }
  }

  /**
   * Get topics with improving trend
   */
  static async getImprovingTopics(studentId: string): Promise<TopicHeatmap[]> {
    try {
      await TopicPerformanceModel.updateTrends(studentId);
      
      const topicPerformances = await TopicPerformanceModel.findByStudent(studentId);

      const improvingTopics: TopicHeatmap[] = topicPerformances
        .filter(perf => perf.trend === 'improving')
        .map(perf => ({
          topic: perf.topic,
          errorRate: perf.errorRate,
          attemptsCount: perf.attemptsCount,
          lastAttempt: perf.lastAttemptAt || new Date(),
          trend: 'improving' as const
        }))
        .sort((a, b) => b.errorRate - a.errorRate);

      return improvingTopics;
    } catch (error) {
      console.error('Error getting improving topics:', error);
      throw error;
    }
  }

  /**
   * Get topics with declining trend
   */
  static async getDecliningTopics(studentId: string): Promise<TopicHeatmap[]> {
    try {
      await TopicPerformanceModel.updateTrends(studentId);
      
      const topicPerformances = await TopicPerformanceModel.findByStudent(studentId);

      const decliningTopics: TopicHeatmap[] = topicPerformances
        .filter(perf => perf.trend === 'declining')
        .map(perf => ({
          topic: perf.topic,
          errorRate: perf.errorRate,
          attemptsCount: perf.attemptsCount,
          lastAttempt: perf.lastAttemptAt || new Date(),
          trend: 'declining' as const
        }))
        .sort((a, b) => b.errorRate - a.errorRate);

      return decliningTopics;
    } catch (error) {
      console.error('Error getting declining topics:', error);
      throw error;
    }
  }

  /**
   * Calculate error rate by topic for visualization
   */
  static async calculateErrorRateByTopic(
    studentId: string,
    subject?: string
  ): Promise<{ topic: string; errorRate: number; subject: string }[]> {
    try {
      const topicPerformances = subject
        ? await TopicPerformanceModel.findByStudentAndSubject(studentId, subject)
        : await TopicPerformanceModel.findByStudent(studentId);

      return topicPerformances.map(perf => ({
        topic: perf.topic,
        errorRate: perf.errorRate,
        subject: perf.subject
      }));
    } catch (error) {
      console.error('Error calculating error rate by topic:', error);
      throw error;
    }
  }
}
