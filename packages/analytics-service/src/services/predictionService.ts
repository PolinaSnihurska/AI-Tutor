import { PredictionModel } from '../models/Prediction';
import { AnalyticsSnapshotModel } from '../models/AnalyticsSnapshot';
import { TopicPerformanceModel } from '../models/TopicPerformance';
import { StudentActivityModel } from '../models/StudentActivity';
import { Prediction, PredictionFactor } from '@ai-tutor/shared-types';
import axios from 'axios';

export class PredictionService {
  /**
   * Generate success prediction for a student
   */
  static async generatePrediction(studentId: string, examType: string): Promise<Prediction> {
    try {
      // Check if we have a recent valid prediction
      const existingPrediction = await PredictionModel.findLatestByStudentAndExam(studentId, examType);
      
      if (existingPrediction && this.isPredictionValid(existingPrediction)) {
        return {
          ...existingPrediction,
          generatedAt: existingPrediction.createdAt
        };
      }

      // Gather data for prediction
      const predictionData = await this.gatherPredictionData(studentId);

      // Generate prediction using AI service or local algorithm
      const prediction = await this.calculatePrediction(studentId, examType, predictionData);

      // Generate factors and recommendations
      const factors = this.generatePredictionFactors(predictionData);
      const recommendations = this.generateRecommendations(predictionData, prediction.predictedScore);

      // Set validity period (7 days)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);

      // Save prediction
      const savedPrediction = await PredictionModel.create({
        studentId,
        examType,
        predictedScore: prediction.predictedScore,
        confidence: prediction.confidence,
        factors,
        recommendations,
        validUntil
      });

      return {
        ...savedPrediction,
        generatedAt: savedPrediction.createdAt
      };
    } catch (error) {
      console.error('Error generating prediction:', error);
      throw error;
    }
  }

  /**
   * Gather all data needed for prediction
   */
  private static async gatherPredictionData(studentId: string): Promise<any> {
    // Get last 30 days of snapshots
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const snapshots = await AnalyticsSnapshotModel.findByStudentAndDateRange(
      studentId,
      startDate,
      endDate
    );

    // Get topic performance
    const topicPerformances = await TopicPerformanceModel.findByStudent(studentId);

    // Get recent activities
    const activities = await StudentActivityModel.findByStudentAndDateRange(
      studentId,
      startDate,
      endDate
    );

    // Calculate metrics
    const avgScore = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.overallScore, 0) / snapshots.length
      : 0;

    const totalStudyTime = snapshots.reduce((sum, s) => sum + s.studyTime, 0);
    const totalTests = snapshots.reduce((sum, s) => sum + s.testsCompleted, 0);

    const avgConsistency = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.consistency, 0) / snapshots.length
      : 0;

    const improvementRate = snapshots.length >= 2
      ? snapshots[0].overallScore - snapshots[snapshots.length - 1].overallScore
      : 0;

    const weakTopicsCount = topicPerformances.filter(t => t.errorRate > 50).length;
    const strongTopicsCount = topicPerformances.filter(t => t.errorRate < 20).length;

    return {
      avgScore,
      totalStudyTime,
      totalTests,
      avgConsistency,
      improvementRate,
      weakTopicsCount,
      strongTopicsCount,
      totalTopics: topicPerformances.length,
      recentActivityCount: activities.length,
      snapshots,
      topicPerformances
    };
  }

  /**
   * Calculate prediction using algorithm or AI service
   */
  private static async calculatePrediction(
    studentId: string,
    examType: string,
    data: any
  ): Promise<{ predictedScore: number; confidence: number }> {
    // Try to use AI service for prediction
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const response = await axios.post(
        `${aiServiceUrl}/api/predictions/generate`,
        {
          studentId,
          examType,
          metrics: {
            avgScore: data.avgScore,
            totalStudyTime: data.totalStudyTime,
            totalTests: data.totalTests,
            consistency: data.avgConsistency,
            improvementRate: data.improvementRate,
            weakTopicsCount: data.weakTopicsCount,
            strongTopicsCount: data.strongTopicsCount
          }
        },
        { timeout: 5000 }
      );

      return {
        predictedScore: response.data.predictedScore,
        confidence: response.data.confidence
      };
    } catch (error) {
      console.log('AI service unavailable, using local algorithm');
      return this.calculatePredictionLocally(data);
    }
  }

  /**
   * Calculate prediction using local algorithm
   */
  private static calculatePredictionLocally(data: any): { predictedScore: number; confidence: number } {
    // Simple weighted algorithm for prediction
    let predictedScore = 0;
    let confidence = 0;

    // Base score from current performance (40% weight)
    predictedScore += data.avgScore * 0.4;

    // Improvement trend (20% weight)
    const improvementBonus = Math.max(-10, Math.min(10, data.improvementRate));
    predictedScore += improvementBonus * 0.2;

    // Consistency factor (20% weight)
    predictedScore += (data.avgConsistency / 100) * 20;

    // Study effort (10% weight)
    const studyEffort = Math.min(100, (data.totalStudyTime / 30) * 2); // Normalize to 100
    predictedScore += (studyEffort / 100) * 10;

    // Topic mastery (10% weight)
    const topicMastery = data.totalTopics > 0
      ? ((data.strongTopicsCount - data.weakTopicsCount) / data.totalTopics) * 100
      : 0;
    predictedScore += (topicMastery / 100) * 10;

    // Ensure score is within bounds
    predictedScore = Math.max(0, Math.min(100, predictedScore));

    // Calculate confidence based on data availability
    confidence = this.calculateConfidence(data);

    return { predictedScore, confidence };
  }

  /**
   * Calculate confidence score based on data availability
   */
  private static calculateConfidence(data: any): number {
    let confidence = 0;

    // More snapshots = higher confidence (max 40 points)
    confidence += Math.min(40, data.snapshots.length * 2);

    // More tests = higher confidence (max 30 points)
    confidence += Math.min(30, data.totalTests * 3);

    // More topics covered = higher confidence (max 20 points)
    confidence += Math.min(20, data.totalTopics * 2);

    // Recent activity = higher confidence (max 10 points)
    confidence += Math.min(10, data.recentActivityCount / 2);

    return Math.min(100, confidence);
  }

  /**
   * Generate prediction factors
   */
  private static generatePredictionFactors(data: any): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    // Current performance factor
    factors.push({
      factor: 'Current Performance',
      impact: data.avgScore > 70 ? 0.3 : data.avgScore > 50 ? 0.1 : -0.2,
      description: `Average score of ${data.avgScore.toFixed(1)}% over the last 30 days`
    });

    // Study consistency factor
    factors.push({
      factor: 'Study Consistency',
      impact: data.avgConsistency > 70 ? 0.2 : data.avgConsistency > 50 ? 0.1 : -0.1,
      description: `${data.avgConsistency.toFixed(0)}% consistency in study habits`
    });

    // Improvement trend factor
    factors.push({
      factor: 'Improvement Trend',
      impact: data.improvementRate > 5 ? 0.25 : data.improvementRate > 0 ? 0.1 : -0.15,
      description: data.improvementRate > 0
        ? `Improving by ${data.improvementRate.toFixed(1)} points`
        : `Declining by ${Math.abs(data.improvementRate).toFixed(1)} points`
    });

    // Topic mastery factor
    const masteryRatio = data.totalTopics > 0
      ? data.strongTopicsCount / data.totalTopics
      : 0;
    factors.push({
      factor: 'Topic Mastery',
      impact: masteryRatio > 0.5 ? 0.15 : masteryRatio > 0.3 ? 0.05 : -0.1,
      description: `${data.strongTopicsCount} strong topics, ${data.weakTopicsCount} weak topics`
    });

    // Study effort factor
    factors.push({
      factor: 'Study Effort',
      impact: data.totalStudyTime > 900 ? 0.1 : data.totalStudyTime > 450 ? 0.05 : -0.05,
      description: `${data.totalStudyTime} minutes of study time in last 30 days`
    });

    return factors;
  }

  /**
   * Generate recommendations based on prediction
   */
  private static generateRecommendations(data: any, predictedScore: number): string[] {
    const recommendations: string[] = [];

    // Score-based recommendations
    if (predictedScore < 60) {
      recommendations.push('Increase study time to at least 30 minutes per day');
      recommendations.push('Focus on understanding weak topics before moving forward');
    } else if (predictedScore < 80) {
      recommendations.push('Maintain current study pace and focus on weak areas');
      recommendations.push('Take more practice tests to identify remaining gaps');
    } else {
      recommendations.push('Continue excellent work and maintain consistency');
      recommendations.push('Challenge yourself with advanced topics');
    }

    // Consistency-based recommendations
    if (data.avgConsistency < 50) {
      recommendations.push('Establish a regular study schedule for better retention');
    }

    // Weak topics recommendations
    if (data.weakTopicsCount > 3) {
      recommendations.push(`Focus on improving ${data.weakTopicsCount} weak topics`);
    }

    // Study time recommendations
    if (data.totalStudyTime < 450) {
      recommendations.push('Increase daily study time for better preparation');
    }

    // Test practice recommendations
    if (data.totalTests < 10) {
      recommendations.push('Take more practice tests to improve exam readiness');
    }

    return recommendations;
  }

  /**
   * Check if prediction is still valid
   */
  private static isPredictionValid(prediction: any): boolean {
    if (!prediction.validUntil) return false;
    return new Date(prediction.validUntil) > new Date();
  }
}
