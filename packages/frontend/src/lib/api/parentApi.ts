import { apiClient } from './client';
import { ParentAnalytics, ChildProfile } from '@ai-tutor/shared-types';

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  taskReminders: boolean;
  weeklyReports: boolean;
  performanceAlerts: boolean;
  dailySummary: boolean;
}

export interface ParentalControls {
  parentId: string;
  childId: string;
  dailyTimeLimitMinutes: number | null;
  contentRestrictions: string[];
  allowedSubjects: string[] | null;
  blockedFeatures: string[];
  active: boolean;
}

export interface ActivityLog {
  id: string;
  childId: string;
  activityType: string;
  activityDetails: Record<string, any>;
  durationMinutes: number;
  timestamp: string;
  flagged: boolean;
  flagReason: string | null;
}

export interface LearningTimeData {
  dailyData: Array<{
    date: string;
    minutes: number;
    activities: number;
  }>;
  timeLimit: {
    limitMinutes: number | null;
    usedMinutes: number;
    exceeded: boolean;
  };
  totalMinutes: number;
  averageMinutesPerDay: number;
}

export const parentApi = {
  // Get list of children
  getChildren: async (): Promise<ChildProfile[]> => {
    const response = await apiClient.get('/api/parent/children');
    return response.data.data;
  },

  // Get child analytics
  getChildAnalytics: async (
    childId: string,
    startDate: string,
    endDate: string
  ): Promise<ParentAnalytics> => {
    const response = await apiClient.get(
      `/api/parent/children/${childId}/analytics`,
      {
        params: { startDate, endDate },
      }
    );
    return response.data.data;
  },

  // Get notification preferences
  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get('/api/parent/notification-preferences');
    return response.data.data;
  },

  // Update notification preferences
  updateNotificationPreferences: async (
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.put(
      '/api/parent/notification-preferences',
      preferences
    );
    return response.data.data;
  },

  // Get parental controls
  getParentalControls: async (childId: string): Promise<ParentalControls> => {
    const response = await apiClient.get(`/api/parent/children/${childId}/controls`);
    return response.data.data;
  },

  // Update parental controls
  updateParentalControls: async (
    childId: string,
    controls: Partial<ParentalControls>
  ): Promise<ParentalControls> => {
    const response = await apiClient.put(
      `/api/parent/children/${childId}/controls`,
      controls
    );
    return response.data.data;
  },

  // Get activity log
  getActivityLog: async (
    childId: string,
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<ActivityLog[]> => {
    const response = await apiClient.get(
      `/api/parent/children/${childId}/activity-log`,
      {
        params: { startDate, endDate, limit },
      }
    );
    return response.data.data;
  },

  // Get learning time monitoring
  getLearningTime: async (
    childId: string,
    days?: number
  ): Promise<LearningTimeData> => {
    const response = await apiClient.get(
      `/api/parent/children/${childId}/learning-time`,
      {
        params: { days },
      }
    );
    return response.data.data;
  },
};
