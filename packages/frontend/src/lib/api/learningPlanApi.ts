import { apiClient } from './client';

export interface LearningPlan {
  id: string;
  studentId: string;
  examType?: string;
  examDate?: string;
  subjects: string[];
  dailyTasks: Task[];
  weeklyGoals: Goal[];
  completionRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  type: 'lesson' | 'test' | 'practice';
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  description?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  completed: boolean;
}

export interface CreateLearningPlanRequest {
  subjects: string[];
  examType?: string;
  examDate?: string;
  weeklyHours: number;
  currentLevel: number;
}

export const learningPlanApi = {
  getCurrentPlan: async (): Promise<LearningPlan> => {
    const response = await apiClient.get('/api/learning-plans/current');
    return response.data;
  },

  createPlan: async (data: CreateLearningPlanRequest): Promise<LearningPlan> => {
    const response = await apiClient.post('/api/learning-plans', data);
    return response.data;
  },

  updateTaskStatus: async (
    planId: string,
    taskId: string,
    status: Task['status']
  ): Promise<void> => {
    await apiClient.patch(`/api/learning-plans/${planId}/tasks/${taskId}`, { status });
  },

  updateGoalProgress: async (
    planId: string,
    goalId: string,
    progress: number
  ): Promise<void> => {
    await apiClient.patch(`/api/learning-plans/${planId}/goals/${goalId}`, { progress });
  },

  deletePlan: async (planId: string): Promise<void> => {
    await apiClient.delete(`/api/learning-plans/${planId}`);
  },
};
