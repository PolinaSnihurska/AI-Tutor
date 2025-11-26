import axios from 'axios';

const api = axios.create({
  baseURL: '/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  revenue: number;
  aiQueriesTotal: number;
  testsGeneratedTotal: number;
}

export interface User {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  age?: number;
  grade?: number;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserDetails extends User {
  subjects?: string[];
  preferences?: any;
  plan?: string;
  subscription_status?: string;
  usage?: {
    total_ai_queries: number;
    total_tests: number;
    total_study_minutes: number;
  };
  performance?: {
    tests_completed: number;
    avg_score: number;
  };
}

export const adminApi = {
  // Auth
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Dashboard
  getMetrics: async (): Promise<AdminMetrics> => {
    const response = await api.get('/dashboard/metrics');
    return response.data;
  },

  // Users
  getUsers: async (page = 1, limit = 50, role?: string) => {
    const response = await api.get('/users', {
      params: { page, limit, role },
    });
    return response.data;
  },

  getUserDetails: async (userId: string): Promise<UserDetails> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateUserStatus: async (userId: string, emailVerified: boolean) => {
    const response = await api.patch(`/users/${userId}/status`, { emailVerified });
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },
};

export default api;
