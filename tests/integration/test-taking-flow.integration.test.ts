import axios from 'axios';

/**
 * Integration Test: Test-Taking and Result Generation Flow
 * Tests Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3
 * 
 * This test validates the complete test lifecycle from generation to results and analytics
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const TEST_SERVICE_URL = process.env.TEST_SERVICE_URL || 'http://localhost:3003';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

describe('Test-Taking and Result Generation Integration Tests', () => {
  let studentToken: string;
  let studentUserId: string;
  let testId: string;
  let resultId: string;

  beforeAll(async () => {
    // Create test student
    const registerResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
      email: `test-taking-student-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'student',
      firstName: 'Test',
      lastName: 'Taker',
      age: 17,
      grade: 12,
    });

    studentToken = registerResponse.data.data.accessToken;
    studentUserId = registerResponse.data.data.user.id;

    // Upgrade to premium
    await axios.put(
      `${AUTH_SERVICE_URL}/subscriptions`,
      { plan: 'premium' },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
  });

  describe('Test Generation', () => {
    it('should generate test within 1 second', async () => {
      const startTime = Date.now();

      const response = await axios.post(
        `${TEST_SERVICE_URL}/tests/generate`,
        {
          subject: 'Mathematics',
          topics: ['Algebra', 'Geometry', 'Calculus'],
          difficulty: 6,
          questionCount: 10,
          questionTypes: ['multiple_choice', 'open_ended'],
          studentLevel: 12,
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(1); // Requirement: <1s
      expect(response.data).toHaveProperty('id');
      expect(response.data.questions).toHaveLength(10);
      expect(response.data.subject).toBe('Mathematics');

      testId = response.data.id;
    });

    it('should generate test with varying difficulty levels', async () => {
      const response = await axios.get(`${TEST_SERVICE_URL}/tests/${testId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
        params: { includeAnswers: false },
      });

      expect(response.status).toBe(200);
      expect(response.data.questions).toBeDefined();

      const difficulties = response.data.questions.map((q: any) => q.difficulty);
      const uniqueDifficulties = new Set(difficulties);
      
      // Should have some variation in difficulty
      expect(uniqueDifficulties.size).toBeGreaterThan(1);
    });

    it('should not include answers when student retrieves test', async () => {
      const response = await axios.get(`${TEST_SERVICE_URL}/tests/${testId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
        params: { includeAnswers: false },
      });

      expect(response.status).toBe(200);
      response.data.questions.forEach((question: any) => {
        expect(question).not.toHaveProperty('correctAnswer');
        expect(question).not.toHaveProperty('explanation');
      });
    });
  });

  describe('Test Taking Process', () => {
    it('should track test start time', async () => {
      const response = await axios.post(
        `${TEST_SERVICE_URL}/tests/${testId}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.startTime).toBeDefined();
      expect(response.data.testId).toBe(testId);
    });

    it('should allow saving progress during test', async () => {
      const response = await axios.post(
        `${TEST_SERVICE_URL}/tests/${testId}/save-progress`,
        {
          answers: [
            { questionId: 'q-1', answer: 'Option A' },
            { questionId: 'q-2', answer: 'Option B' },
          ],
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.saved).toBe(true);
    });

    it('should retrieve saved progress', async () => {
      const response = await axios.get(
        `${TEST_SERVICE_URL}/tests/${testId}/progress`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.answers).toBeDefined();
      expect(response.data.answers.length).toBeGreaterThan(0);
    });
  });

  describe('Test Submission and Evaluation', () => {
    it('should submit test and receive immediate results', async () => {
      // Get test questions
      const testResponse = await axios.get(`${TEST_SERVICE_URL}/tests/${testId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
        params: { includeAnswers: false },
      });

      const questions = testResponse.data.questions;

      // Submit answers (mix of correct and incorrect)
      const answers = questions.map((q: any, index: number) => ({
        questionId: q.id,
        answer: index % 2 === 0 ? 'Correct Answer' : 'Wrong Answer',
      }));

      const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const endTime = new Date();

      const response = await axios.post(
        `${TEST_SERVICE_URL}/tests/submit`,
        {
          testId,
          studentId: studentUserId,
          answers,
          startTime,
          endTime,
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.score).toBeDefined();
      expect(response.data.percentage).toBeDefined();
      expect(response.data.correctAnswers).toBeDefined();
      expect(response.data.totalQuestions).toBe(10);
      expect(response.data.timeSpent).toBeDefined();

      resultId = response.data.id;
    });

    it('should provide detailed explanations for incorrect answers', async () => {
      const response = await axios.get(`${TEST_SERVICE_URL}/tests/result/${resultId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.detailedResults).toBeDefined();
      expect(Array.isArray(response.data.detailedResults)).toBe(true);

      response.data.detailedResults.forEach((result: any) => {
        expect(result).toHaveProperty('questionId');
        expect(result).toHaveProperty('correct');
        expect(result).toHaveProperty('explanation');
        
        if (!result.correct) {
          expect(result.explanation).toBeTruthy();
          expect(result.explanation.length).toBeGreaterThan(0);
        }
      });
    });

    it('should identify weak topics from test results', async () => {
      const response = await axios.get(`${TEST_SERVICE_URL}/tests/result/${resultId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.weakTopics).toBeDefined();
      expect(Array.isArray(response.data.weakTopics)).toBe(true);
      
      if (response.data.percentage < 80) {
        expect(response.data.weakTopics.length).toBeGreaterThan(0);
      }
    });

    it('should provide personalized recommendations based on results', async () => {
      const response = await axios.get(`${TEST_SERVICE_URL}/tests/result/${resultId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.recommendations).toBeDefined();
      expect(Array.isArray(response.data.recommendations)).toBe(true);
      expect(response.data.recommendations.length).toBeGreaterThan(0);

      // Recommendations should be actionable
      response.data.recommendations.forEach((rec: string) => {
        expect(rec.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Adaptive Questioning', () => {
    it('should generate adaptive test based on previous performance', async () => {
      const response = await axios.post(
        `${TEST_SERVICE_URL}/tests/adaptive/generate`,
        {
          studentId: studentUserId,
          subject: 'Mathematics',
          topics: ['Algebra', 'Geometry'],
          questionCount: 8,
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.questions).toHaveLength(8);
      expect(response.data.title).toContain('Adaptive');
    });

    it('should adjust difficulty based on student responses', async () => {
      // Get first adaptive question
      const firstResponse = await axios.post(
        `${TEST_SERVICE_URL}/tests/adaptive/next-question`,
        {
          studentId: studentUserId,
          subject: 'Physics',
          topics: ['Mechanics'],
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(firstResponse.status).toBe(200);
      const firstDifficulty = firstResponse.data.difficulty;

      // Submit correct answer
      await axios.post(
        `${TEST_SERVICE_URL}/tests/adaptive/submit-answer`,
        {
          studentId: studentUserId,
          questionId: firstResponse.data.id,
          answer: firstResponse.data.correctAnswer,
          correct: true,
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      // Get next question - should be harder
      const secondResponse = await axios.post(
        `${TEST_SERVICE_URL}/tests/adaptive/next-question`,
        {
          studentId: studentUserId,
          subject: 'Physics',
          topics: ['Mechanics'],
        },
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(secondResponse.status).toBe(200);
      // Difficulty should increase or stay same
      expect(secondResponse.data.difficulty).toBeGreaterThanOrEqual(firstDifficulty);
    });
  });

  describe('Analytics Integration', () => {
    it('should update analytics after test submission', async () => {
      // Wait a moment for analytics to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await axios.get(
        `${ANALYTICS_SERVICE_URL}/analytics/progress/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
          params: {
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.testsCompleted).toBeGreaterThan(0);
      expect(response.data.overallScore).toBeDefined();
    });

    it('should generate heatmap from test results', async () => {
      const response = await axios.get(
        `${ANALYTICS_SERVICE_URL}/analytics/heatmap/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.subjects).toBeDefined();
      expect(Array.isArray(response.data.subjects)).toBe(true);

      if (response.data.subjects.length > 0) {
        const mathSubject = response.data.subjects.find((s: any) => s.subject === 'Mathematics');
        if (mathSubject) {
          expect(mathSubject.topics).toBeDefined();
          expect(Array.isArray(mathSubject.topics)).toBe(true);
        }
      }
    });

    it('should update performance predictions after test', async () => {
      const response = await axios.get(
        `${ANALYTICS_SERVICE_URL}/analytics/prediction/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
          params: { examType: 'NMT' },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.predictedScore).toBeDefined();
      expect(response.data.confidence).toBeDefined();
      expect(response.data.confidence).toBeGreaterThanOrEqual(0);
      expect(response.data.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Test History', () => {
    it('should retrieve test history for student', async () => {
      const response = await axios.get(
        `${TEST_SERVICE_URL}/tests/history/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
          params: { limit: 10 },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      response.data.forEach((test: any) => {
        expect(test).toHaveProperty('id');
        expect(test).toHaveProperty('subject');
        expect(test).toHaveProperty('createdAt');
      });
    });

    it('should retrieve all results for student', async () => {
      const response = await axios.get(
        `${TEST_SERVICE_URL}/tests/results/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      response.data.forEach((result: any) => {
        expect(result).toHaveProperty('testId');
        expect(result).toHaveProperty('percentage');
        expect(result).toHaveProperty('createdAt');
      });
    });

    it('should filter test history by subject', async () => {
      const response = await axios.get(
        `${TEST_SERVICE_URL}/tests/history/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
          params: { subject: 'Mathematics', limit: 10 },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      response.data.forEach((test: any) => {
        expect(test.subject).toBe('Mathematics');
      });
    });

    it('should show performance trends over time', async () => {
      const response = await axios.get(
        `${ANALYTICS_SERVICE_URL}/analytics/trends/${studentUserId}`,
        {
          headers: { Authorization: `Bearer ${studentToken}` },
          params: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.performanceTrend).toBeDefined();
      expect(response.data.improvementRate).toBeDefined();
    });
  });
});
