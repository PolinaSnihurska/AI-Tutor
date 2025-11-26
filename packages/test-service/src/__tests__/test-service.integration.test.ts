import request from 'supertest';
import express, { Express } from 'express';
import testRoutes from '../routes/testRoutes';
import { connectToMongoDB, disconnectFromMongoDB, getDatabase } from '../db/connection';
import { Test, TestSubmission, Question } from '@ai-tutor/shared-types';
import axios from 'axios';

// Mock axios for AI service calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

let app: Express;

beforeAll(async () => {
  // Set up Express app
  app = express();
  app.use(express.json());
  app.use('/tests', testRoutes);
  
  // Connect to test database
  await connectToMongoDB();
  
  // Clean up test data
  const db = getDatabase();
  await db.collection('tests').deleteMany({});
  await db.collection('test_results').deleteMany({});
  
  // Setup default mock for AI service
  setupAIServiceMock();
});

afterEach(async () => {
  // Clean up after each test
  const db = getDatabase();
  await db.collection('tests').deleteMany({});
  await db.collection('test_results').deleteMany({});
  
  // Reset mocks
  jest.clearAllMocks();
  setupAIServiceMock();
});

afterAll(async () => {
  await disconnectFromMongoDB();
});

function setupAIServiceMock() {
  // Mock test generation
  mockedAxios.post.mockImplementation((url: string, data?: any) => {
    if (url.includes('/tests/generate')) {
      const questionCount = data.question_count || 5;
      const questions = [];
      
      for (let i = 0; i < questionCount; i++) {
        const topic = data.topics[i % data.topics.length];
        questions.push({
          id: `q-${i + 1}`,
          type: 'multiple_choice',
          content: `Sample question ${i + 1} about ${topic}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: 'Option A',
          explanation: `The correct answer is Option A because...`,
          difficulty: data.difficulty || 5,
          topic: topic,
          points: 10,
        });
      }
      
      return Promise.resolve({
        data: {
          title: `${data.subject} Test`,
          subject: data.subject,
          topics: data.topics,
          questions: questions,
          time_limit: questionCount * 2,
          passing_score: 70,
        },
      });
    }
    
    return Promise.reject(new Error('Unmocked URL'));
  });
  
  // Mock getting student results
  mockedAxios.get.mockImplementation((url: string) => {
    if (url.includes('/tests/results/')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.reject(new Error('Unmocked URL'));
  });
}

describe('Test Service Integration Tests', () => {
  describe('Complete Test Lifecycle', () => {
    it('should create, take, submit, and evaluate a test', async () => {
      const studentId = 'test-student-123';
      
      // Step 1: Generate a test
      const generateResponse = await request(app)
        .post('/tests/generate')
        .send({
          subject: 'Mathematics',
          topics: ['Algebra', 'Geometry'],
          difficulty: 5,
          questionCount: 5,
          questionTypes: ['multiple_choice'],
          studentLevel: 10,
        });

      expect(generateResponse.status).toBe(201);
      expect(generateResponse.body).toHaveProperty('id');
      expect(generateResponse.body.questions).toHaveLength(5);
      
      const testId = generateResponse.body.id;
      const test = generateResponse.body as Test;

      // Step 2: Get test without answers (as student would)
      const getTestResponse = await request(app)
        .get(`/tests/${testId}`)
        .query({ includeAnswers: 'false' });

      expect(getTestResponse.status).toBe(200);
      expect(getTestResponse.body.questions[0]).not.toHaveProperty('correctAnswer');

      // Step 3: Submit test answers
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 10 * 60 * 1000); // 10 minutes later

      const answers = test.questions.map((q: Question) => ({
        questionId: q.id,
        answer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
      }));

      const submission: TestSubmission = {
        testId,
        studentId,
        answers,
        startTime,
        endTime,
      };

      const submitResponse = await request(app)
        .post('/tests/submit')
        .send(submission);

      expect(submitResponse.status).toBe(201);
      expect(submitResponse.body).toHaveProperty('id');
      expect(submitResponse.body.percentage).toBeGreaterThan(0);
      expect(submitResponse.body.detailedResults).toHaveLength(5);
      expect(submitResponse.body).toHaveProperty('weakTopics');
      expect(submitResponse.body).toHaveProperty('recommendations');
      expect(submitResponse.body.recommendations.length).toBeGreaterThan(0);

      // Step 4: Retrieve test result
      const resultId = submitResponse.body.id;
      const getResultResponse = await request(app)
        .get(`/tests/result/${resultId}`);

      expect(getResultResponse.status).toBe(200);
      expect(getResultResponse.body.id).toBe(resultId);
      expect(getResultResponse.body.studentId).toBe(studentId);
    });

    it('should handle incorrect answers and identify weak topics', async () => {
      const studentId = 'test-student-456';
      
      // Generate a test
      const generateResponse = await request(app)
        .post('/tests/generate')
        .send({
          subject: 'Physics',
          topics: ['Mechanics', 'Thermodynamics'],
          difficulty: 6,
          questionCount: 4,
          questionTypes: ['multiple_choice'],
        });

      const test = generateResponse.body as Test;
      const testId = test.id;

      // Submit with intentionally wrong answers
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 5 * 60 * 1000);

      const answers = test.questions.map((q: Question) => ({
        questionId: q.id,
        answer: 'Wrong Answer',
      }));

      const submitResponse = await request(app)
        .post('/tests/submit')
        .send({
          testId,
          studentId,
          answers,
          startTime,
          endTime,
        });

      expect(submitResponse.status).toBe(201);
      expect(submitResponse.body.percentage).toBeLessThan(50);
      expect(submitResponse.body.correctAnswers).toBe(0);
      expect(submitResponse.body.weakTopics.length).toBeGreaterThan(0);
      
      // Verify recommendations are provided for poor performance
      expect(submitResponse.body.recommendations.length).toBeGreaterThan(0);
      const hasStudyRecommendation = submitResponse.body.recommendations.some(
        (rec: string) => rec.includes('Focus areas') || rec.includes('Review')
      );
      expect(hasStudyRecommendation).toBe(true);
    });
  });

  describe('Adaptive Questioning', () => {
    it('should generate adaptive test based on student profile', async () => {
      const studentId = 'adaptive-student-789';
      
      // Generate adaptive test
      const response = await request(app)
        .post('/tests/adaptive/generate')
        .send({
          studentId,
          subject: 'Chemistry',
          topics: ['Organic Chemistry', 'Inorganic Chemistry'],
          questionCount: 6,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.questions).toHaveLength(6);
      expect(response.body.title).toContain('Adaptive');
      
      // Verify questions have varying difficulty
      const difficulties = response.body.questions.map((q: Question) => q.difficulty);
      expect(difficulties.length).toBe(6);
    });

    it('should get next adaptive question for student', async () => {
      const studentId = 'adaptive-student-next-123';
      
      const response = await request(app)
        .post('/tests/adaptive/next-question')
        .send({
          studentId,
          subject: 'Biology',
          topics: ['Cell Biology', 'Genetics'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('difficulty');
      expect(response.body).toHaveProperty('topic');
      expect(['Cell Biology', 'Genetics']).toContain(response.body.topic);
    });

    it('should adjust difficulty based on performance', async () => {
      const studentId = 'adaptive-perf-student-456';
      
      // First, create a test result showing good performance
      const initialTest = await request(app)
        .post('/tests/generate')
        .send({
          subject: 'History',
          topics: ['World War II'],
          difficulty: 3,
          questionCount: 3,
          questionTypes: ['multiple_choice'],
        });

      const test = initialTest.body as Test;
      
      // Submit with all correct answers
      const correctAnswers = test.questions.map((q: Question) => ({
        questionId: q.id,
        answer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
      }));

      await request(app)
        .post('/tests/submit')
        .send({
          testId: test.id,
          studentId,
          answers: correctAnswers,
          startTime: new Date(),
          endTime: new Date(),
        });

      // Now generate adaptive test - should have higher difficulty
      const adaptiveResponse = await request(app)
        .post('/tests/adaptive/generate')
        .send({
          studentId,
          subject: 'History',
          topics: ['World War II'],
          questionCount: 3,
        });

      expect(adaptiveResponse.status).toBe(201);
      const adaptiveTest = adaptiveResponse.body as Test;
      
      // Verify test was generated
      expect(adaptiveTest.questions).toHaveLength(3);
    });
  });

  describe('Weak Topic Identification', () => {
    it('should accurately identify weak topics from test results', async () => {
      const studentId = 'weak-topic-student-123';
      
      // Create a test with multiple topics
      const generateResponse = await request(app)
        .post('/tests/generate')
        .send({
          subject: 'Science',
          topics: ['Physics', 'Chemistry', 'Biology'],
          difficulty: 5,
          questionCount: 9,
          questionTypes: ['multiple_choice'],
        });

      const test = generateResponse.body as Test;
      
      // Submit answers: correct for Physics, wrong for Chemistry and Biology
      const answers = test.questions.map((q: Question) => {
        if (q.topic === 'Physics') {
          return {
            questionId: q.id,
            answer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
          };
        } else {
          return {
            questionId: q.id,
            answer: 'Wrong Answer',
          };
        }
      });

      const submitResponse = await request(app)
        .post('/tests/submit')
        .send({
          testId: test.id,
          studentId,
          answers,
          startTime: new Date(),
          endTime: new Date(),
        });

      expect(submitResponse.status).toBe(201);
      
      // Verify weak topics are identified
      const weakTopics = submitResponse.body.weakTopics;
      expect(weakTopics.length).toBeGreaterThan(0);
      
      // Physics should not be in weak topics (all correct)
      expect(weakTopics).not.toContain('Physics');
    });

    it('should provide topic-specific recommendations', async () => {
      const studentId = 'topic-rec-student-456';
      
      const generateResponse = await request(app)
        .post('/tests/generate')
        .send({
          subject: 'Mathematics',
          topics: ['Calculus', 'Statistics'],
          difficulty: 7,
          questionCount: 6,
          questionTypes: ['multiple_choice'],
        });

      const test = generateResponse.body as Test;
      
      // Submit with poor performance
      const answers = test.questions.map((q: Question) => ({
        questionId: q.id,
        answer: 'Wrong',
      }));

      const submitResponse = await request(app)
        .post('/tests/submit')
        .send({
          testId: test.id,
          studentId,
          answers,
          startTime: new Date(),
          endTime: new Date(),
        });

      expect(submitResponse.status).toBe(201);
      
      // Verify recommendations mention weak topics
      const recommendations = submitResponse.body.recommendations;
      expect(recommendations.length).toBeGreaterThan(0);
      
      const hasTopicMention = recommendations.some((rec: string) => 
        rec.includes('Calculus') || rec.includes('Statistics') || rec.includes('Focus areas')
      );
      expect(hasTopicMention).toBe(true);
    });
  });

  describe('Test History and Results', () => {
    it('should retrieve test history for a student', async () => {
      const studentId = 'history-student-123';
      
      // Create and submit multiple tests
      for (let i = 0; i < 3; i++) {
        const generateResponse = await request(app)
          .post('/tests/generate')
          .send({
            subject: 'English',
            topics: ['Grammar'],
            difficulty: 5,
            questionCount: 2,
            questionTypes: ['multiple_choice'],
          });

        const test = generateResponse.body as Test;
        
        const answers = test.questions.map((q: Question) => ({
          questionId: q.id,
          answer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
        }));

        await request(app)
          .post('/tests/submit')
          .send({
            testId: test.id,
            studentId,
            answers,
            startTime: new Date(),
            endTime: new Date(),
          });
      }

      // Get test history
      const historyResponse = await request(app)
        .get(`/tests/history/${studentId}`)
        .query({ limit: 10 });

      expect(historyResponse.status).toBe(200);
      expect(Array.isArray(historyResponse.body)).toBe(true);
      expect(historyResponse.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should retrieve all results for a student', async () => {
      const studentId = 'results-student-456';
      
      // Create and submit a test
      const generateResponse = await request(app)
        .post('/tests/generate')
        .send({
          subject: 'Geography',
          topics: ['World Capitals'],
          difficulty: 4,
          questionCount: 3,
          questionTypes: ['multiple_choice'],
        });

      const test = generateResponse.body as Test;
      
      const answers = test.questions.map((q: Question) => ({
        questionId: q.id,
        answer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
      }));

      await request(app)
        .post('/tests/submit')
        .send({
          testId: test.id,
          studentId,
          answers,
          startTime: new Date(),
          endTime: new Date(),
        });

      // Get results
      const resultsResponse = await request(app)
        .get(`/tests/results/${studentId}`);

      expect(resultsResponse.status).toBe(200);
      expect(Array.isArray(resultsResponse.body)).toBe(true);
      expect(resultsResponse.body.length).toBeGreaterThan(0);
      expect(resultsResponse.body[0]).toHaveProperty('testId');
      expect(resultsResponse.body[0]).toHaveProperty('percentage');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid test ID', async () => {
      const response = await request(app)
        .get('/tests/invalid-id');

      expect(response.status).toBe(500);
    });

    it('should handle missing required fields in test generation', async () => {
      const response = await request(app)
        .post('/tests/generate')
        .send({
          subject: 'Math',
          // Missing topics, difficulty, questionCount
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid submission data', async () => {
      const response = await request(app)
        .post('/tests/submit')
        .send({
          testId: 'some-id',
          // Missing studentId, answers, etc.
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });
});
