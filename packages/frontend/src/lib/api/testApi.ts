import { apiClient } from './client';

export interface Test {
  id: string;
  title: string;
  subject: string;
  topics: string[];
  questions: Question[];
  timeLimit?: number;
  passingScore: number;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'open_ended';
  content: string;
  options?: string[];
  difficulty: number;
  topic: string;
  points: number;
}

export interface TestSubmission {
  testId: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  startTime: string;
  endTime: string;
}

export interface TestResult {
  id: string;
  testId: string;
  score: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  detailedResults: Array<{
    questionId: string;
    correct: boolean;
    userAnswer: string | string[];
    correctAnswer: string | string[];
    explanation: string;
  }>;
  weakTopics: string[];
  recommendations: string[];
  createdAt: string;
}

export const testApi = {
  getTest: async (testId: string): Promise<Test> => {
    const response = await apiClient.get(`/api/tests/${testId}`);
    return response.data;
  },

  getTests: async (filters?: {
    subject?: string;
    difficulty?: number;
  }): Promise<Test[]> => {
    const response = await apiClient.get('/api/tests', { params: filters });
    return response.data;
  },

  submitTest: async (submission: TestSubmission): Promise<TestResult> => {
    const response = await apiClient.post('/api/tests/submit', submission);
    return response.data;
  },

  getTestHistory: async (): Promise<TestResult[]> => {
    const response = await apiClient.get('/api/tests/history');
    return response.data;
  },

  getTestResult: async (resultId: string): Promise<TestResult> => {
    const response = await apiClient.get(`/api/tests/results/${resultId}`);
    return response.data;
  },
};
