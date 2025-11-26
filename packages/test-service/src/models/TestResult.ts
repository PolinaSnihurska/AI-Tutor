import { ObjectId } from 'mongodb';
import { TestResult as TestResultType, QuestionResult } from '@ai-tutor/shared-types';

export interface TestResultDocument extends Omit<TestResultType, 'id' | 'createdAt'> {
  _id?: ObjectId;
  createdAt: Date;
}

export function toTestResultResponse(doc: TestResultDocument): TestResultType {
  return {
    id: doc._id!.toString(),
    testId: doc.testId,
    studentId: doc.studentId,
    score: doc.score,
    percentage: doc.percentage,
    correctAnswers: doc.correctAnswers,
    totalQuestions: doc.totalQuestions,
    timeSpent: doc.timeSpent,
    detailedResults: doc.detailedResults,
    weakTopics: doc.weakTopics,
    recommendations: doc.recommendations,
    createdAt: doc.createdAt,
  };
}
