import { PredictionService } from '../services/predictionService';
import { HeatmapService } from '../services/heatmapService';
import { EventTrackingService } from '../services/eventTrackingService';
import { AnalyticsSnapshotModel } from '../models/AnalyticsSnapshot';
import { TopicPerformanceModel } from '../models/TopicPerformance';
import { StudentActivityModel } from '../models/StudentActivity';
import { PredictionModel } from '../models/Prediction';
import pool from '../db/connection';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    duplicate: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined)
    }))
  }))
}));

describe('Analytics Accuracy Tests', () => {
  const testStudentId = 'test-student-analytics-' + Date.now();
  
  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query('DELETE FROM predictions WHERE student_id LIKE $1', ['test-student-analytics-%']);
    await pool.query('DELETE FROM topic_performance WHERE student_id LIKE $1', ['test-student-analytics-%']);
    await pool.query('DELETE FROM student_activities WHERE student_id LIKE $1', ['test-student-analytics-%']);
    await pool.query('DELETE FROM analytics_snapshots WHERE student_id LIKE $1', ['test-student-analytics-%']);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM predictions WHERE student_id LIKE $1', ['test-student-analytics-%']);
    await pool.query('DELETE FROM topic_performance WHERE student_id LIKE $1', ['test-student-analytics-%']);
    await pool.query('DELETE FROM student_activities WHERE student_id LIKE $1', ['test-student-analytics-%']);
    await pool.query('DELETE FROM analytics_snapshots WHERE student_id LIKE $1', ['test-student-analytics-%']);
  });

  describe('Prediction Accuracy (Requirement 4.3)', () => {
    beforeEach(async () => {
      // Create realistic test data for prediction
      await createTestDataForPrediction(testStudentId);
    });

    test('should generate prediction with confidence score', async () => {
      const prediction = await PredictionService.generatePrediction(testStudentId, 'NMT');
      
      expect(prediction).toBeDefined();
      expect(prediction.studentId).toBe(testStudentId);
      expect(prediction.examType).toBe('NMT');
      expect(prediction.predictedScore).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedScore).toBeLessThanOrEqual(100);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
    });

    test('should include prediction factors', async () => {
      const prediction = await PredictionService.generatePrediction(testStudentId, 'NMT');
      
      expect(prediction.factors).toBeDefined();
      expect(Array.isArray(prediction.factors)).toBe(true);
      expect(prediction.factors.length).toBeGreaterThan(0);
      
      // Verify factor structure
      prediction.factors.forEach(factor => {
        expect(factor).toHaveProperty('factor');
        expect(factor).toHaveProperty('impact');
        expect(factor).toHaveProperty('description');
        expect(typeof factor.impact).toBe('number');
      });
    });

    test('should include actionable recommendations', async () => {
      const prediction = await PredictionService.generatePrediction(testStudentId, 'NMT');
      
      expect(prediction.recommendations).toBeDefined();
      expect(Array.isArray(prediction.recommendations)).toBe(true);
      expect(prediction.recommendations.length).toBeGreaterThan(0);
      
      // Recommendations should be strings
      prediction.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    test('should have prediction accuracy within acceptable range', async () => {
      // Create data with known performance pattern
      const knownStudentId = 'test-student-known-' + Date.now();
      await createKnownPerformanceData(knownStudentId, 75); // 75% average score
      
      const prediction = await PredictionService.generatePrediction(knownStudentId, 'NMT');
      
      // Prediction should be within ±15% of actual performance (85% accuracy requirement)
      expect(prediction.predictedScore).toBeGreaterThanOrEqual(60);
      expect(prediction.predictedScore).toBeLessThanOrEqual(90);
      
      // Clean up
      await pool.query('DELETE FROM analytics_snapshots WHERE student_id = $1', [knownStudentId]);
      await pool.query('DELETE FROM topic_performance WHERE student_id = $1', [knownStudentId]);
    });

    test('should cache predictions and reuse valid ones', async () => {
      const prediction1 = await PredictionService.generatePrediction(testStudentId, 'NMT');
      const prediction2 = await PredictionService.generatePrediction(testStudentId, 'NMT');
      
      // Should return the same prediction if still valid
      expect(prediction1.predictedScore).toBe(prediction2.predictedScore);
      expect(prediction1.confidence).toBe(prediction2.confidence);
    });

    test('should adjust confidence based on data availability', async () => {
      // Student with minimal data
      const minimalStudentId = 'test-student-minimal-' + Date.now();
      await createMinimalTestData(minimalStudentId);
      
      const minimalPrediction = await PredictionService.generatePrediction(minimalStudentId, 'NMT');
      
      // Student with extensive data
      const extensiveStudentId = 'test-student-extensive-' + Date.now();
      await createExtensiveTestData(extensiveStudentId);
      
      const extensivePrediction = await PredictionService.generatePrediction(extensiveStudentId, 'NMT');
      
      // Extensive data should have higher confidence
      expect(extensivePrediction.confidence).toBeGreaterThan(minimalPrediction.confidence);
      
      // Clean up
      await pool.query('DELETE FROM analytics_snapshots WHERE student_id IN ($1, $2)', [minimalStudentId, extensiveStudentId]);
      await pool.query('DELETE FROM topic_performance WHERE student_id IN ($1, $2)', [minimalStudentId, extensiveStudentId]);
      await pool.query('DELETE FROM predictions WHERE student_id IN ($1, $2)', [minimalStudentId, extensiveStudentId]);
    });
  });

  describe('Real-time Update Performance (Requirement 4.4)', () => {
    test('should track events and update metrics within 10 seconds', async () => {
      const startTime = Date.now();
      
      // Track an event
      await EventTrackingService.trackEvent({
        studentId: testStudentId,
        activityType: 'test_completed',
        subject: 'Mathematics',
        topic: 'Algebra',
        score: 85,
        durationMinutes: 30,
        metadata: { correct: true, questionCount: 10 }
      });
      
      // Get real-time metrics
      const metrics = await EventTrackingService.getRealtimeMetrics(testStudentId);
      
      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000; // Convert to seconds
      
      // Should complete within 10 seconds
      expect(elapsedTime).toBeLessThan(10);
      
      // Metrics should be updated
      expect(metrics).toBeDefined();
      expect(metrics.testsCompleted).toBeGreaterThanOrEqual(1);
    });

    test('should handle multiple concurrent events efficiently', async () => {
      const startTime = Date.now();
      const eventCount = 10;
      
      // Track multiple events concurrently
      const eventPromises = Array.from({ length: eventCount }, (_, i) =>
        EventTrackingService.trackEvent({
          studentId: testStudentId,
          activityType: 'test_completed',
          subject: 'Mathematics',
          topic: `Topic ${i}`,
          score: 70 + i,
          durationMinutes: 20,
          metadata: { correct: i % 2 === 0 }
        })
      );
      
      await Promise.all(eventPromises);
      
      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;
      
      // Should handle all events within 10 seconds
      expect(elapsedTime).toBeLessThan(10);
      
      // Verify all events were tracked
      const metrics = await EventTrackingService.getRealtimeMetrics(testStudentId);
      expect(metrics.testsCompleted).toBeGreaterThanOrEqual(eventCount);
    });

    test('should update topic performance in real-time', async () => {
      const topic = 'Real-time Test Topic';
      
      // Track correct answer
      await EventTrackingService.trackEvent({
        studentId: testStudentId,
        activityType: 'test_completed',
        subject: 'Science',
        topic,
        score: 100,
        metadata: { correct: true }
      });
      
      // Verify topic performance was updated
      const performances = await TopicPerformanceModel.findByStudentAndSubject(testStudentId, 'Science');
      const topicPerf = performances.find(p => p.topic === topic);
      
      expect(topicPerf).toBeDefined();
      expect(topicPerf!.attemptsCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Heatmap Generation Correctness (Requirement 4.2)', () => {
    beforeEach(async () => {
      // Create test data for heatmap
      await createTestDataForHeatmap(testStudentId);
    });

    test('should generate complete heatmap with all subjects', async () => {
      const heatmap = await HeatmapService.generateHeatmap(testStudentId);
      
      expect(heatmap).toBeDefined();
      expect(heatmap.studentId).toBe(testStudentId);
      expect(heatmap.subjects).toBeDefined();
      expect(Array.isArray(heatmap.subjects)).toBe(true);
      expect(heatmap.subjects.length).toBeGreaterThan(0);
    });

    test('should correctly calculate error rates', async () => {
      const heatmap = await HeatmapService.generateHeatmap(testStudentId);
      
      // Verify error rates are within valid range
      heatmap.subjects.forEach(subject => {
        subject.topics.forEach(topic => {
          expect(topic.errorRate).toBeGreaterThanOrEqual(0);
          expect(topic.errorRate).toBeLessThanOrEqual(100);
        });
      });
    });

    test('should sort topics by error rate descending', async () => {
      const heatmap = await HeatmapService.generateHeatmap(testStudentId);
      
      heatmap.subjects.forEach(subject => {
        for (let i = 0; i < subject.topics.length - 1; i++) {
          expect(subject.topics[i].errorRate).toBeGreaterThanOrEqual(
            subject.topics[i + 1].errorRate
          );
        }
      });
    });

    test('should identify weak topics correctly', async () => {
      const weakTopics = await HeatmapService.getWeakTopics(testStudentId, 50);
      
      expect(Array.isArray(weakTopics)).toBe(true);
      
      // All weak topics should have error rate >= 50%
      weakTopics.forEach(topic => {
        expect(topic.errorRate).toBeGreaterThanOrEqual(50);
      });
    });

    test('should identify strong topics correctly', async () => {
      const strongTopics = await HeatmapService.getStrongTopics(testStudentId, 20);
      
      expect(Array.isArray(strongTopics)).toBe(true);
      
      // All strong topics should have error rate <= 20%
      strongTopics.forEach(topic => {
        expect(topic.errorRate).toBeLessThanOrEqual(20);
      });
    });

    test('should calculate trends correctly', async () => {
      // Create improving trend data
      const improvingTopic = 'Improving Topic';
      await createImprovingTrendData(testStudentId, improvingTopic);
      
      const improvingTopics = await HeatmapService.getImprovingTopics(testStudentId);
      const found = improvingTopics.find(t => t.topic === improvingTopic);
      
      expect(found).toBeDefined();
      expect(found!.trend).toBe('improving');
    });

    test('should include all required topic metadata', async () => {
      const heatmap = await HeatmapService.generateHeatmap(testStudentId);
      
      heatmap.subjects.forEach(subject => {
        subject.topics.forEach(topic => {
          expect(topic).toHaveProperty('topic');
          expect(topic).toHaveProperty('errorRate');
          expect(topic).toHaveProperty('attemptsCount');
          expect(topic).toHaveProperty('lastAttempt');
          expect(topic).toHaveProperty('trend');
          
          expect(typeof topic.topic).toBe('string');
          expect(typeof topic.errorRate).toBe('number');
          expect(typeof topic.attemptsCount).toBe('number');
          expect(topic.lastAttempt).toBeInstanceOf(Date);
        });
      });
    });

    test('should generate subject-specific heatmap', async () => {
      const subject = 'Mathematics';
      const subjectHeatmap = await HeatmapService.generateSubjectHeatmap(testStudentId, subject);
      
      expect(subjectHeatmap).toBeDefined();
      expect(subjectHeatmap.subject).toBe(subject);
      expect(Array.isArray(subjectHeatmap.topics)).toBe(true);
      
      // All topics should belong to the specified subject
      const allTopics = await TopicPerformanceModel.findByStudentAndSubject(testStudentId, subject);
      expect(subjectHeatmap.topics.length).toBe(allTopics.length);
    });
  });
});

// Helper functions to create test data

async function createTestDataForPrediction(studentId: string): Promise<void> {
  // Create 30 days of snapshots
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    await AnalyticsSnapshotModel.create({
      studentId,
      snapshotDate: date,
      overallScore: 70 + Math.random() * 20,
      subjectScores: [
        { subject: 'Mathematics', score: 75 + Math.random() * 15, testsCompleted: 2, trend: 'stable' as const },
        { subject: 'Science', score: 70 + Math.random() * 20, testsCompleted: 2, trend: 'stable' as const },
        { subject: 'English', score: 80 + Math.random() * 10, testsCompleted: 1, trend: 'improving' as const }
      ],
      testsCompleted: Math.floor(Math.random() * 5) + 1,
      studyTime: Math.floor(Math.random() * 60) + 30,
      improvementRate: Math.random() * 10 - 5,
      consistency: 60 + Math.random() * 30
    });
  }
  
  // Create topic performance data
  const subjects = ['Mathematics', 'Science', 'English'];
  const topics = ['Topic A', 'Topic B', 'Topic C', 'Topic D'];
  
  for (const subject of subjects) {
    for (const topic of topics) {
      for (let i = 0; i < 5; i++) {
        await TopicPerformanceModel.upsert({
          studentId,
          subject,
          topic,
          isCorrect: Math.random() > 0.3
        });
      }
    }
  }
}

async function createKnownPerformanceData(studentId: string, targetScore: number): Promise<void> {
  // Create consistent performance data
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    await AnalyticsSnapshotModel.create({
      studentId,
      snapshotDate: date,
      overallScore: targetScore + (Math.random() * 10 - 5), // ±5 variation
      subjectScores: [
        { subject: 'Mathematics', score: targetScore, testsCompleted: 1, trend: 'stable' as const },
        { subject: 'Science', score: targetScore, testsCompleted: 1, trend: 'stable' as const },
        { subject: 'English', score: targetScore, testsCompleted: 1, trend: 'stable' as const }
      ],
      testsCompleted: 3,
      studyTime: 45,
      improvementRate: 2,
      consistency: 80
    });
  }
  
  // Create topic performance
  for (let i = 0; i < 10; i++) {
    await TopicPerformanceModel.upsert({
      studentId,
      subject: 'Mathematics',
      topic: `Topic ${i}`,
      isCorrect: Math.random() * 100 < targetScore
    });
  }
}

async function createMinimalTestData(studentId: string): Promise<void> {
  // Only 3 snapshots
  for (let i = 0; i < 3; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    await AnalyticsSnapshotModel.create({
      studentId,
      snapshotDate: date,
      overallScore: 60,
      subjectScores: [
        { subject: 'Mathematics', score: 60, testsCompleted: 1, trend: 'stable' as const }
      ],
      testsCompleted: 1,
      studyTime: 20,
      improvementRate: 0,
      consistency: 50
    });
  }
}

async function createExtensiveTestData(studentId: string): Promise<void> {
  // 30 snapshots with lots of activity
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    await AnalyticsSnapshotModel.create({
      studentId,
      snapshotDate: date,
      overallScore: 75 + Math.random() * 15,
      subjectScores: [
        { subject: 'Mathematics', score: 80, testsCompleted: 2, trend: 'improving' as const },
        { subject: 'Science', score: 75, testsCompleted: 1, trend: 'stable' as const },
        { subject: 'English', score: 85, testsCompleted: 1, trend: 'improving' as const },
        { subject: 'History', score: 70, testsCompleted: 1, trend: 'stable' as const }
      ],
      testsCompleted: 5,
      studyTime: 90,
      improvementRate: 5,
      consistency: 85
    });
  }
  
  // Many topic performances
  const subjects = ['Mathematics', 'Science', 'English', 'History'];
  for (const subject of subjects) {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        await TopicPerformanceModel.upsert({
          studentId,
          subject,
          topic: `${subject} Topic ${i}`,
          isCorrect: Math.random() > 0.25
        });
      }
    }
  }
}

async function createTestDataForHeatmap(studentId: string): Promise<void> {
  const subjects = ['Mathematics', 'Science', 'English'];
  const topicsPerSubject = {
    Mathematics: ['Algebra', 'Geometry', 'Calculus', 'Statistics'],
    Science: ['Physics', 'Chemistry', 'Biology'],
    English: ['Grammar', 'Literature', 'Writing']
  };
  
  for (const subject of subjects) {
    const topics = topicsPerSubject[subject as keyof typeof topicsPerSubject];
    
    for (const topic of topics) {
      // Create varied performance for different topics
      const errorRate = Math.random();
      const attempts = Math.floor(Math.random() * 10) + 5;
      
      for (let i = 0; i < attempts; i++) {
        await TopicPerformanceModel.upsert({
          studentId,
          subject,
          topic,
          isCorrect: Math.random() > errorRate
        });
      }
    }
  }
}

async function createImprovingTrendData(studentId: string, topic: string): Promise<void> {
  // Create activities showing improvement over time
  const activities = [
    { correct: false, daysAgo: 10 },
    { correct: false, daysAgo: 9 },
    { correct: false, daysAgo: 8 },
    { correct: true, daysAgo: 3 },
    { correct: true, daysAgo: 2 },
    { correct: true, daysAgo: 1 },
    { correct: true, daysAgo: 0 }
  ];
  
  for (const activity of activities) {
    await StudentActivityModel.create({
      studentId,
      activityType: 'test_completed',
      subject: 'Mathematics',
      topic,
      metadata: { correct: activity.correct },
      score: activity.correct ? 100 : 0
    });
    
    await TopicPerformanceModel.upsert({
      studentId,
      subject: 'Mathematics',
      topic,
      isCorrect: activity.correct
    });
  }
}
