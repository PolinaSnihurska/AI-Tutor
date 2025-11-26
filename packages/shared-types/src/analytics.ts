import { DateRange } from './common';

export interface Progress {
  studentId: string;
  period: DateRange;
  overallScore: number;
  subjectScores: SubjectScore[];
  testsCompleted: number;
  studyTime: number;
  improvementRate: number;
  consistency: number;
}

export interface SubjectScore {
  subject: string;
  score: number;
  testsCompleted: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface Heatmap {
  studentId: string;
  subjects: SubjectHeatmap[];
  generatedAt: Date;
}

export interface SubjectHeatmap {
  subject: string;
  topics: TopicHeatmap[];
}

export interface TopicHeatmap {
  topic: string;
  errorRate: number;
  attemptsCount: number;
  lastAttempt: Date;
  trend: 'improving' | 'stable' | 'declining';
}

export interface Prediction {
  studentId: string;
  examType: string;
  predictedScore: number;
  confidence: number;
  factors: PredictionFactor[];
  recommendations: string[];
  generatedAt: Date;
}

export interface PredictionFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface ParentAnalytics {
  childId: string;
  period: DateRange;
  studyTime: TimeMetrics;
  performanceBySubject: SubjectScore[];
  weakTopics: string[];
  recommendations: string[];
  comparisonToGoals: GoalComparison;
}

export interface TimeMetrics {
  totalMinutes: number;
  dailyAverage: number;
  weeklyTrend: number[];
}

export interface GoalComparison {
  targetScore: number;
  currentScore: number;
  onTrack: boolean;
  daysRemaining: number;
}
