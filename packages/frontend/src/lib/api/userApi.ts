import { apiClient } from './client';

export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'parent' | 'admin';
  firstName: string;
  lastName: string;
  age?: number;
  grade?: number;
  subjects?: string[];
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  age?: number;
  grade?: number;
  subjects?: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'premium' | 'family';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
}

export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/api/users/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.put('/api/users/profile', data);
    return response.data;
  },

  getSubscription: async (): Promise<Subscription> => {
    const response = await apiClient.get('/api/subscriptions/current');
    return response.data;
  },

  getChildren: async (): Promise<UserProfile[]> => {
    const response = await apiClient.get('/api/users/children');
    return response.data;
  },

  linkChild: async (childEmail: string): Promise<void> => {
    await apiClient.post('/api/users/link-child', { childEmail });
  },
};
