import { apiClient } from './client';

export interface ExplanationRequest {
  topic: string;
  subject: string;
  context?: string;
}

export interface Explanation {
  content: string;
  examples: Array<{
    title: string;
    content: string;
  }>;
  relatedTopics: string[];
  difficulty: number;
}

export interface TestGenerationRequest {
  subject: string;
  topics: string[];
  difficulty: number;
  questionCount: number;
  format: 'multiple_choice' | 'open_ended' | 'mixed';
}

export interface GeneratedTest {
  id: string;
  title: string;
  subject: string;
  questions: Array<{
    id: string;
    type: string;
    content: string;
    options?: string[];
    difficulty: number;
    topic: string;
  }>;
}

export interface LearningPlanRequest {
  subjects: string[];
  examDate?: string;
  currentLevel: number;
  weeklyHours: number;
}

export interface GeneratedLearningPlan {
  id: string;
  dailyTasks: Array<{
    id: string;
    title: string;
    subject: string;
    type: string;
    estimatedTime: number;
  }>;
  weeklyGoals: Array<{
    id: string;
    description: string;
    targetDate: string;
  }>;
}

export const aiApi = {
  getExplanation: async (data: ExplanationRequest): Promise<Explanation> => {
    const response = await apiClient.post('/api/ai/explain', data);
    return response.data;
  },

  generateTest: async (data: TestGenerationRequest): Promise<GeneratedTest> => {
    const response = await apiClient.post('/api/ai/generate-test', data);
    return response.data;
  },

  generateLearningPlan: async (data: LearningPlanRequest): Promise<GeneratedLearningPlan> => {
    const response = await apiClient.post('/api/ai/learning-plan', data);
    return response.data;
  },
};
