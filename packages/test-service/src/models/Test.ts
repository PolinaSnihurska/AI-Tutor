import { ObjectId } from 'mongodb';
import { Test as TestType, Question, QuestionType } from '@ai-tutor/shared-types';

export interface TestDocument extends Omit<TestType, 'id' | 'createdAt'> {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionDocument extends Question {
  _id?: ObjectId;
}

export function toTestResponse(doc: TestDocument): TestType {
  return {
    id: doc._id!.toString(),
    title: doc.title,
    subject: doc.subject,
    topics: doc.topics,
    questions: doc.questions,
    timeLimit: doc.timeLimit,
    passingScore: doc.passingScore,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
  };
}

export function validateQuestion(question: Question): boolean {
  if (!question.id || !question.content || !question.topic) {
    return false;
  }

  if (question.difficulty < 1 || question.difficulty > 10) {
    return false;
  }

  if (question.points <= 0) {
    return false;
  }

  // Validate based on question type
  switch (question.type) {
    case 'multiple_choice':
      if (!question.options || question.options.length < 2) {
        return false;
      }
      if (typeof question.correctAnswer !== 'string') {
        return false;
      }
      break;
    
    case 'true_false':
      if (!question.options || question.options.length !== 2) {
        return false;
      }
      if (typeof question.correctAnswer !== 'string') {
        return false;
      }
      break;
    
    case 'open_ended':
      // Open-ended questions can have string or array answers
      break;
    
    default:
      return false;
  }

  return true;
}
