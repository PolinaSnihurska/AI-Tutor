import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { Test, TestSubmission, Question } from '@ai-tutor/shared-types';
import { TestDocument, toTestResponse, validateQuestion } from '../models/Test';
import axios from 'axios';
import { cacheService } from './cacheService';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export class TestService {
  private get testsCollection() {
    return getDatabase().collection<TestDocument>('tests');
  }

  async createTest(testData: Omit<Test, 'id' | 'createdAt'>): Promise<Test> {
    // Validate questions
    for (const question of testData.questions) {
      if (!validateQuestion(question)) {
        throw new Error(`Invalid question: ${question.id}`);
      }
    }

    const document: TestDocument = {
      ...testData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.testsCollection.insertOne(document);
    document._id = result.insertedId;

    return toTestResponse(document);
  }

  async generateTest(params: {
    subject: string;
    topics: string[];
    difficulty: number;
    questionCount: number;
    questionTypes?: string[];
    studentLevel?: number;
    useCache?: boolean;
  }): Promise<Test> {
    try {
      // Check cache first (only for standard templates without student-specific params)
      if (params.useCache !== false && !params.studentLevel) {
        const cached = await cacheService.getCachedTestTemplate({
          subject: params.subject,
          topics: params.topics,
          difficulty: params.difficulty,
          questionCount: params.questionCount,
        });

        if (cached) {
          console.log('Cache hit for test template');
          // Create a new test instance from cached template
          return await this.createTest(cached);
        }
      }

      // Call AI service to generate test
      const response = await axios.post(`${AI_SERVICE_URL}/tests/generate`, {
        subject: params.subject,
        topics: params.topics,
        difficulty: params.difficulty,
        question_count: params.questionCount,
        question_types: params.questionTypes || ['multiple_choice'],
        student_level: params.studentLevel,
      });

      const generatedTest = response.data;

      // Convert AI response to our Test format
      const testData = {
        title: generatedTest.title,
        subject: generatedTest.subject,
        topics: generatedTest.topics,
        questions: generatedTest.questions.map((q: any) => ({
          id: q.id,
          type: q.type,
          content: q.content,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          topic: q.topic,
          points: q.points,
        })),
        timeLimit: generatedTest.time_limit,
        passingScore: generatedTest.passing_score,
        createdBy: 'ai' as const,
      };

      // Cache template if it's a standard test (no student-specific params)
      if (!params.studentLevel) {
        await cacheService.cacheTestTemplate({
          subject: params.subject,
          topics: params.topics,
          difficulty: params.difficulty,
          questionCount: params.questionCount,
        }, testData);
      }

      // Save and return test
      const test = await this.createTest(testData);
      return test;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI service error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getTest(testId: string, studentId?: string): Promise<Test> {
    if (!ObjectId.isValid(testId)) {
      throw new Error('Invalid test ID');
    }

    const test = await this.testsCollection.findOne({ _id: new ObjectId(testId) });

    if (!test) {
      throw new Error('Test not found');
    }

    return toTestResponse(test);
  }

  async getTestWithoutAnswers(testId: string): Promise<Omit<Test, 'questions'> & { questions: Omit<Question, 'correctAnswer'>[] }> {
    const test = await this.getTest(testId);

    // Remove correct answers from questions
    const questionsWithoutAnswers = test.questions.map(q => {
      const { correctAnswer, ...questionWithoutAnswer } = q;
      return questionWithoutAnswer;
    });

    return {
      ...test,
      questions: questionsWithoutAnswers,
    };
  }

  async getTestHistory(studentId: string, limit: number = 20): Promise<Test[]> {
    // Get test IDs from test results
    const testResultsCollection = getDatabase().collection('test_results');
    
    const results = await testResultsCollection
      .find({ studentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const testIds = [...new Set(results.map((r: any) => r.testId))];

    // Get tests
    const tests = await this.testsCollection
      .find({ _id: { $in: testIds.map(id => new ObjectId(id)) } })
      .toArray();

    return tests.map(toTestResponse);
  }

  async searchTests(filters: {
    subject?: string;
    topics?: string[];
    difficulty?: number;
    createdBy?: 'ai' | 'admin';
    limit?: number;
  }): Promise<Test[]> {
    const query: any = {};

    if (filters.subject) {
      query.subject = filters.subject;
    }

    if (filters.topics && filters.topics.length > 0) {
      query.topics = { $in: filters.topics };
    }

    if (filters.difficulty) {
      // Find tests where most questions match the difficulty
      query['questions.difficulty'] = filters.difficulty;
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    const tests = await this.testsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 20)
      .toArray();

    return tests.map(toTestResponse);
  }

  async deleteTest(testId: string): Promise<void> {
    if (!ObjectId.isValid(testId)) {
      throw new Error('Invalid test ID');
    }

    const result = await this.testsCollection.deleteOne({ _id: new ObjectId(testId) });

    if (result.deletedCount === 0) {
      throw new Error('Test not found');
    }
  }
}

export const testService = new TestService();
