export type TaskType = 'lesson' | 'test' | 'practice';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface LearningPlan {
  id: string;
  studentId: string;
  examType?: string;
  examDate?: Date;
  dailyTasks: Task[];
  weeklyGoals: Goal[];
  completionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  type: TaskType;
  estimatedTime: number;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  description?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
  progress: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  subject?: string;
  topic?: string;
  difficulty?: number;
  helpful?: boolean;
}

export interface LearningContext {
  currentSubject: string;
  currentTopic: string;
  studentLevel: number;
  recentTopics: string[];
  knowledgeGaps: string[];
}

export interface Explanation {
  content: string;
  examples: Example[];
  relatedTopics: string[];
  difficulty: number;
  estimatedReadTime: number;
}

export interface Example {
  title: string;
  content: string;
  solution?: string;
}

export type NotificationType = 'task_reminder' | 'goal_reminder' | 'daily_summary' | 'weekly_report';
export type NotificationChannel = 'email' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  scheduledFor: Date;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface ReminderSchedule {
  taskId: string;
  userId: string;
  reminderTime: Date;
  sent: boolean;
}
