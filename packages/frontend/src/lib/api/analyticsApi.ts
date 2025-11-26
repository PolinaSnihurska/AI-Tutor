import { apiClient } from './client';

export interface Progress {
  studentId: string;
  period: {
    start: string;
    end: string;
  };
  overallScore: number;
  subjectScores: Array<{
    subject: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  testsCompleted: number;
  studyTime: number;
  improvementRate: number;
  consistency: number;
}

export interface Heatmap {
  studentId: string;
  subjects: Array<{
    subject: string;
    topics: Array<{
      topic: string;
      errorRate: number;
      attemptsCount: number;
      lastAttempt: string;
      trend: 'improving' | 'stable' | 'declining';
    }>;
  }>;
  generatedAt: string;
}

export interface Prediction {
  studentId: string;
  examType: string;
  predictedScore: number;
  confidence: number;
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  recommendations: string[];
  generatedAt: string;
}

export const analyticsApi = {
  getProgress: async (
    studentId?: string,
    period?: { start: string; end: string }
  ): Promise<Progress> => {
    const response = await apiClient.get(`/api/analytics/progress/${studentId}`, {
      params: {
        startDate: period?.start,
        endDate: period?.end,
      },
    });
    return response.data;
  },

  getHeatmap: async (studentId?: string): Promise<Heatmap> => {
    const response = await apiClient.get(`/api/analytics/heatmap/${studentId}`);
    return response.data;
  },

  getPrediction: async (studentId?: string, examType?: string): Promise<Prediction> => {
    const response = await apiClient.get(`/api/analytics/prediction/${studentId}`, {
      params: { examType },
    });
    return response.data;
  },

  getPerformanceTrends: async (
    studentId?: string,
    period?: { start: string; end: string }
  ): Promise<{
    trends: Array<{
      date: string;
      score: number;
      subject: string;
    }>;
  }> => {
    const response = await apiClient.get(`/api/analytics/trends/${studentId}`, {
      params: {
        startDate: period?.start,
        endDate: period?.end,
      },
    });
    return response.data;
  },
};
