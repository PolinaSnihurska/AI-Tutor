export type UserRole = 'student' | 'parent' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  age?: number;
  grade?: number;
  subjects?: string[];
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: NotificationPreferences;
  concentrationMode?: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  taskReminders: boolean;
  weeklyReports: boolean;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  grade: number;
  subjects: string[];
  examTarget?: string;
  lastActive: Date;
}
