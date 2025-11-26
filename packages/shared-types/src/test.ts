export type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: number;
  topic: string;
  points: number;
}

export interface Test {
  id: string;
  title: string;
  subject: string;
  topics: string[];
  questions: Question[];
  timeLimit?: number;
  passingScore: number;
  createdBy: 'ai' | 'admin';
  createdAt: Date;
}

export interface TestSubmission {
  testId: string;
  studentId: string;
  answers: Answer[];
  startTime: Date;
  endTime: Date;
}

export interface Answer {
  questionId: string;
  answer: string | string[];
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  score: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  detailedResults: QuestionResult[];
  weakTopics: string[];
  recommendations: string[];
  createdAt: Date;
}

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  explanation: string;
}
