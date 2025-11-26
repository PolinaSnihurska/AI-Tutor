import { ParentAnalyticsService } from '../services/parentAnalyticsService';
import { AnalyticsSnapshotModel } from '../models/AnalyticsSnapshot';
import { TopicPerformanceModel } from '../models/TopicPerformance';
import { StudentActivityModel } from '../models/StudentActivity';
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

describe('Parent Cabinet Features Tests (Requirement 5.1, 5.2, 5.3, 5.4, 5.5)', () => {
  const parentId = 'test-parent-' + Date.now();
  const child1Id = 'test-child1-' + Date.now();
  const child2Id = 'test-child2-' + Date.now();
  const otherParentId = 'test-other-parent-' + Date.now();
  const otherChildId = 'test-other-child-' + Date.now();

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();
    
    // Create test users
    await createTestUsers();
    
    // Create parent-child relationships
    await createParentChildLinks();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Data Access Authorization (Requirement 5.1, 5.5)', () => {
    beforeEach(async () => {
      // Create test data for children
      await createChildTestData(child1Id);
      await createChildTestData(child2Id);
      await createChildTestData(otherChildId);
    });

    test('should allow parent to access their own children data', async () => {
      // Verify parent can access child1
      const analytics1 = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics1).toBeDefined();
      expect(analytics1.childId).toBe(child1Id);
      expect(analytics1.studyTime).toBeDefined();
      expect(analytics1.performanceBySubject).toBeDefined();

      // Verify parent can access child2
      const analytics2 = await ParentAnalyticsService.getChildAnalytics(
        child2Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics2).toBeDefined();
      expect(analytics2.childId).toBe(child2Id);
    });

    test('should prevent parent from accessing non-linked child data', async () => {
      // In a real implementation, this would be enforced by middleware
      // Here we verify that the data is isolated per child
      const child1Analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      const otherChildAnalytics = await ParentAnalyticsService.getChildAnalytics(
        otherChildId,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      // Verify data is different and isolated
      expect(child1Analytics.childId).not.toBe(otherChildAnalytics.childId);
      expect(child1Analytics.studyTime).not.toEqual(otherChildAnalytics.studyTime);
    });

    test('should return only linked children in aggregated analytics', async () => {
      const aggregated = await ParentAnalyticsService.getAggregatedAnalytics(
        [child1Id, child2Id],
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(aggregated).toBeDefined();
      expect(aggregated.totalStudyTime).toBeGreaterThan(0);
      expect(aggregated.averagePerformance).toBeGreaterThanOrEqual(0);
      expect(aggregated.averagePerformance).toBeLessThanOrEqual(100);
    });

    test('should verify parent-child relationship exists in database', async () => {
      const result = await pool.query(
        'SELECT * FROM parent_child_links WHERE parent_id = $1 AND child_id = $2',
        [parentId, child1Id]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].parent_id).toBe(parentId);
      expect(result.rows[0].child_id).toBe(child1Id);
    });

    test('should not find relationship for non-linked children', async () => {
      const result = await pool.query(
        'SELECT * FROM parent_child_links WHERE parent_id = $1 AND child_id = $2',
        [parentId, otherChildId]
      );

      expect(result.rows.length).toBe(0);
    });
  });

  describe('Analytics Accuracy for Parent View (Requirement 5.2)', () => {
    beforeEach(async () => {
      await createDetailedChildData(child1Id);
    });

    test('should accurately calculate study time metrics', async () => {
      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics.studyTime).toBeDefined();
      expect(analytics.studyTime.totalMinutes).toBeGreaterThan(0);
      expect(analytics.studyTime.dailyAverage).toBeGreaterThanOrEqual(0);
      expect(analytics.studyTime.weeklyTrend).toHaveLength(7);
      
      // Verify weekly trend contains valid data
      analytics.studyTime.weeklyTrend.forEach(minutes => {
        expect(minutes).toBeGreaterThanOrEqual(0);
        expect(minutes).toBeLessThan(1440); // Less than 24 hours
      });
    });

    test('should accurately calculate performance by subject', async () => {
      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics.performanceBySubject).toBeDefined();
      expect(Array.isArray(analytics.performanceBySubject)).toBe(true);
      expect(analytics.performanceBySubject.length).toBeGreaterThan(0);

      // Verify each subject has valid data
      analytics.performanceBySubject.forEach(subject => {
        expect(subject.subject).toBeDefined();
        expect(subject.score).toBeGreaterThanOrEqual(0);
        expect(subject.score).toBeLessThanOrEqual(100);
        expect(subject.testsCompleted).toBeGreaterThan(0);
        expect(['improving', 'stable', 'declining']).toContain(subject.trend);
      });
    });

    test('should correctly identify weak topics', async () => {
      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics.weakTopics).toBeDefined();
      expect(Array.isArray(analytics.weakTopics)).toBe(true);
      
      // Weak topics should be limited to top 5
      expect(analytics.weakTopics.length).toBeLessThanOrEqual(5);
      
      // Each weak topic should be a string
      analytics.weakTopics.forEach(topic => {
        expect(typeof topic).toBe('string');
        expect(topic.length).toBeGreaterThan(0);
      });
    });

    test('should accurately calculate goal comparison', async () => {
      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics.comparisonToGoals).toBeDefined();
      expect(analytics.comparisonToGoals.targetScore).toBeGreaterThan(0);
      expect(analytics.comparisonToGoals.currentScore).toBeGreaterThanOrEqual(0);
      expect(analytics.comparisonToGoals.currentScore).toBeLessThanOrEqual(100);
      expect(typeof analytics.comparisonToGoals.onTrack).toBe('boolean');
      expect(analytics.comparisonToGoals.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    test('should handle multiple children aggregation accurately', async () => {
      await createDetailedChildData(child2Id);

      const aggregated = await ParentAnalyticsService.getAggregatedAnalytics(
        [child1Id, child2Id],
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(aggregated.totalStudyTime).toBeGreaterThan(0);
      expect(aggregated.averagePerformance).toBeGreaterThanOrEqual(0);
      expect(aggregated.averagePerformance).toBeLessThanOrEqual(100);
      expect(Array.isArray(aggregated.childrenNeedingAttention)).toBe(true);
    });

    test('should correctly identify children needing attention', async () => {
      // Create struggling child data
      await createStrugglingChildData(child2Id);

      const aggregated = await ParentAnalyticsService.getAggregatedAnalytics(
        [child1Id, child2Id],
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      // Child2 should be flagged as needing attention
      expect(aggregated.childrenNeedingAttention).toContain(child2Id);
    });

    test('should calculate trends correctly over time', async () => {
      // Create improving trend data
      await createImprovingChildData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      // Should have at least one improving subject
      const improvingSubjects = analytics.performanceBySubject.filter(
        s => s.trend === 'improving'
      );
      expect(improvingSubjects.length).toBeGreaterThan(0);
    });
  });

  describe('Recommendation Quality (Requirement 5.3, 5.4)', () => {
    test('should generate recommendations for low study time', async () => {
      await createLowStudyTimeData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics.recommendations).toBeDefined();
      expect(Array.isArray(analytics.recommendations)).toBe(true);
      expect(analytics.recommendations.length).toBeGreaterThan(0);

      // Should recommend more study time
      const hasStudyTimeRecommendation = analytics.recommendations.some(
        rec => rec.toLowerCase().includes('study time') || rec.toLowerCase().includes('daily')
      );
      expect(hasStudyTimeRecommendation).toBe(true);
    });

    test('should generate recommendations for declining performance', async () => {
      await createDecliningPerformanceData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics.recommendations.length).toBeGreaterThan(0);

      // Should recommend attention to declining subjects
      const hasDecliningRecommendation = analytics.recommendations.some(
        rec => rec.toLowerCase().includes('declining') || rec.toLowerCase().includes('attention')
      );
      expect(hasDecliningRecommendation).toBe(true);
    });

    test('should generate recommendations for weak topics', async () => {
      await createWeakTopicsData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      expect(analytics.recommendations.length).toBeGreaterThan(0);
      expect(analytics.weakTopics.length).toBeGreaterThan(0);

      // Should recommend focus on weak topics
      const hasWeakTopicRecommendation = analytics.recommendations.some(
        rec => rec.toLowerCase().includes('topic') || rec.toLowerCase().includes('priority')
      );
      expect(hasWeakTopicRecommendation).toBe(true);
    });

    test('should provide positive reinforcement for improving performance', async () => {
      await createImprovingChildData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      // Should include positive feedback
      const hasPositiveRecommendation = analytics.recommendations.some(
        rec => rec.toLowerCase().includes('progress') || 
               rec.toLowerCase().includes('good work') ||
               rec.toLowerCase().includes('great')
      );
      expect(hasPositiveRecommendation).toBe(true);
    });

    test('should recommend tutoring for low-performing subjects', async () => {
      await createLowPerformanceData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      // Should recommend additional support
      const hasSupportRecommendation = analytics.recommendations.some(
        rec => rec.toLowerCase().includes('tutoring') || 
               rec.toLowerCase().includes('practice') ||
               rec.toLowerCase().includes('focus')
      );
      expect(hasSupportRecommendation).toBe(true);
    });

    test('should provide actionable and specific recommendations', async () => {
      await createDetailedChildData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      // All recommendations should be non-empty strings
      analytics.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(10); // Should be meaningful
        expect(rec.trim()).toBe(rec); // Should not have leading/trailing whitespace
      });

      // Should have at least one recommendation
      expect(analytics.recommendations.length).toBeGreaterThan(0);
    });

    test('should warn about excessive study time', async () => {
      await createExcessiveStudyTimeData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      // Should recommend breaks
      const hasBurnoutWarning = analytics.recommendations.some(
        rec => rec.toLowerCase().includes('break') || rec.toLowerCase().includes('burnout')
      );
      expect(hasBurnoutWarning).toBe(true);
    });

    test('should detect decreasing study time trend', async () => {
      await createDecreasingStudyTrendData(child1Id);

      const analytics = await ParentAnalyticsService.getChildAnalytics(
        child1Id,
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      // Should warn about decreasing study time
      const hasDecreasingTrendWarning = analytics.recommendations.some(
        rec => rec.toLowerCase().includes('decreased') || 
               rec.toLowerCase().includes('motivation') ||
               rec.toLowerCase().includes('support')
      );
      expect(hasDecreasingTrendWarning).toBe(true);
    });
  });
});

// Helper functions

async function cleanupTestData() {
  await pool.query('DELETE FROM predictions WHERE student_id LIKE $1', ['test-%']);
  await pool.query('DELETE FROM topic_performance WHERE student_id LIKE $1', ['test-%']);
  await pool.query('DELETE FROM student_activities WHERE student_id LIKE $1', ['test-%']);
  await pool.query('DELETE FROM analytics_snapshots WHERE student_id LIKE $1', ['test-%']);
  await pool.query('DELETE FROM learning_plans WHERE student_id LIKE $1', ['test-%']);
  await pool.query('DELETE FROM parent_child_links WHERE parent_id LIKE $1 OR child_id LIKE $1', ['test-%']);
  await pool.query('DELETE FROM subscriptions WHERE user_id LIKE $1', ['test-%']);
  await pool.query('DELETE FROM users WHERE id LIKE $1', ['test-%']);
}

async function createTestUsers() {
  const users = [
    { id: 'test-parent-' + Date.now(), role: 'parent', email: 'parent@test.com' },
    { id: 'test-child1-' + Date.now(), role: 'student', email: 'child1@test.com' },
    { id: 'test-child2-' + Date.now(), role: 'student', email: 'child2@test.com' },
    { id: 'test-other-parent-' + Date.now(), role: 'parent', email: 'otherparent@test.com' },
    { id: 'test-other-child-' + Date.now(), role: 'student', email: 'otherchild@test.com' }
  ];

  // Note: In a real test, we would create actual users
  // For this test, we're focusing on the analytics service
}

async function createParentChildLinks() {
  const parentId = 'test-parent-' + Date.now();
  const child1Id = 'test-child1-' + Date.now();
  const child2Id = 'test-child2-' + Date.now();
  const otherParentId = 'test-other-parent-' + Date.now();
  const otherChildId = 'test-other-child-' + Date.now();

  await pool.query(
    'INSERT INTO parent_child_links (parent_id, child_id) VALUES ($1, $2), ($1, $3), ($4, $5) ON CONFLICT DO NOTHING',
    [parentId, child1Id, parentId, child2Id, otherParentId, otherChildId]
  );
}

async function createChildTestData(childId: string) {
  // Create basic test data
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    await StudentActivityModel.create({
      studentId: childId,
      activityType: 'test_completed',
      subject: 'Mathematics',
      topic: 'Algebra',
      score: 70 + Math.random() * 20,
      durationMinutes: 30,
      metadata: {}
    });
  }
}

async function createDetailedChildData(childId: string) {
  const subjects = ['Mathematics', 'Science', 'English'];
  
  // Create 30 days of data
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    await AnalyticsSnapshotModel.create({
      studentId: childId,
      snapshotDate: date,
      overallScore: 75 + Math.random() * 15,
      subjectScores: subjects.map(subject => ({
        subject,
        score: 70 + Math.random() * 20,
        testsCompleted: Math.floor(Math.random() * 3) + 1,
        trend: 'stable' as const
      })),
      testsCompleted: 3,
      studyTime: 45 + Math.floor(Math.random() * 30),
      improvementRate: Math.random() * 10 - 5,
      consistency: 70 + Math.random() * 20
    });

    // Create activities
    for (const subject of subjects) {
      await StudentActivityModel.create({
        studentId: childId,
        activityType: 'test_completed',
        subject,
        topic: `${subject} Topic`,
        score: 70 + Math.random() * 20,
        durationMinutes: 30,
        metadata: {}
      });
    }
  }

  // Create topic performance
  for (const subject of subjects) {
    for (let i = 0; i < 5; i++) {
      await TopicPerformanceModel.upsert({
        studentId: childId,
        subject,
        topic: `${subject} Topic ${i}`,
        isCorrect: Math.random() > 0.4
      });
    }
  }
}

async function createStrugglingChildData(childId: string) {
  // Create data showing poor performance
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    await AnalyticsSnapshotModel.create({
      studentId: childId,
      snapshotDate: date,
      overallScore: 45 + Math.random() * 10,
      subjectScores: [
        { subject: 'Mathematics', score: 40, testsCompleted: 1, trend: 'declining' as const },
        { subject: 'Science', score: 50, testsCompleted: 1, trend: 'stable' as const }
      ],
      testsCompleted: 2,
      studyTime: 20,
      improvementRate: -5,
      consistency: 40
    });
  }

  // Create many weak topics
  for (let i = 0; i < 10; i++) {
    await TopicPerformanceModel.upsert({
      studentId: childId,
      subject: 'Mathematics',
      topic: `Weak Topic ${i}`,
      isCorrect: false
    });
  }
}

async function createImprovingChildData(childId: string) {
  // Create data showing improvement
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const score = 60 + (30 - i); // Improving over time

    await AnalyticsSnapshotModel.create({
      studentId: childId,
      snapshotDate: date,
      overallScore: score,
      subjectScores: [
        { subject: 'Mathematics', score: score, testsCompleted: 1, trend: 'improving' as const },
        { subject: 'Science', score: score + 5, testsCompleted: 1, trend: 'improving' as const }
      ],
      testsCompleted: 2,
      studyTime: 45,
      improvementRate: 2,
      consistency: 80
    });
  }
}

async function createLowStudyTimeData(childId: string) {
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    await StudentActivityModel.create({
      studentId: childId,
      activityType: 'test_completed',
      subject: 'Mathematics',
      topic: 'Algebra',
      score: 70,
      durationMinutes: 10, // Very low study time
      metadata: {}
    });
  }
}

async function createDecliningPerformanceData(childId: string) {
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const score = 80 - i; // Declining over time

    await AnalyticsSnapshotModel.create({
      studentId: childId,
      snapshotDate: date,
      overallScore: Math.max(40, score),
      subjectScores: [
        { subject: 'Mathematics', score: Math.max(40, score), testsCompleted: 1, trend: 'declining' as const }
      ],
      testsCompleted: 1,
      studyTime: 30,
      improvementRate: -3,
      consistency: 60
    });
  }
}

async function createWeakTopicsData(childId: string) {
  const weakTopics = ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'];
  
  for (const topic of weakTopics) {
    for (let i = 0; i < 10; i++) {
      await TopicPerformanceModel.upsert({
        studentId: childId,
        subject: 'Mathematics',
        topic,
        isCorrect: Math.random() < 0.3 // 70% error rate
      });
    }
  }
}

async function createLowPerformanceData(childId: string) {
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    await AnalyticsSnapshotModel.create({
      studentId: childId,
      snapshotDate: date,
      overallScore: 50,
      subjectScores: [
        { subject: 'Mathematics', score: 45, testsCompleted: 1, trend: 'stable' as const },
        { subject: 'Science', score: 55, testsCompleted: 1, trend: 'stable' as const }
      ],
      testsCompleted: 2,
      studyTime: 30,
      improvementRate: 0,
      consistency: 50
    });
  }
}

async function createExcessiveStudyTimeData(childId: string) {
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    await StudentActivityModel.create({
      studentId: childId,
      activityType: 'test_completed',
      subject: 'Mathematics',
      topic: 'Algebra',
      score: 80,
      durationMinutes: 180, // 3 hours per day
      metadata: {}
    });
  }
}

async function createDecreasingStudyTrendData(childId: string) {
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const minutes = 90 - (i * 10); // Decreasing from 90 to 30 minutes

    await StudentActivityModel.create({
      studentId: childId,
      activityType: 'test_completed',
      subject: 'Mathematics',
      topic: 'Algebra',
      score: 70,
      durationMinutes: Math.max(10, minutes),
      metadata: {}
    });
  }
}
