import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { TestSubmission, TestResult, QuestionResult } from '@ai-tutor/shared-types';
import { TestResultDocument, toTestResultResponse } from '../models/TestResult';
import { testService } from './testService';
import { evaluationService } from './evaluationService';

export class TestSubmissionService {
  private get testResultsCollection() {
    return getDatabase().collection<TestResultDocument>('test_results');
  }

  async submitTest(submission: TestSubmission): Promise<TestResult> {
    // Get the test with answers
    const test = await testService.getTest(submission.testId);

    // Calculate time spent
    const timeSpent = Math.floor(
      (submission.endTime.getTime() - submission.startTime.getTime()) / 1000
    );

    // Evaluate answers
    const detailedResults: QuestionResult[] = [];
    let correctAnswers = 0;
    let totalScore = 0;
    let maxScore = 0;

    for (const question of test.questions) {
      const userAnswer = submission.answers.find(a => a.questionId === question.id);
      const isCorrect = this.checkAnswer(
        userAnswer?.answer,
        question.correctAnswer,
        question.type
      );

      if (isCorrect) {
        correctAnswers++;
        totalScore += question.points;
      }

      maxScore += question.points;

      detailedResults.push({
        questionId: question.id,
        correct: isCorrect,
        userAnswer: userAnswer?.answer || '',
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });
    }

    // Calculate percentage
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Analyze performance
    const analysis = evaluationService.analyzeTestPerformance(
      test.questions,
      detailedResults
    );

    // Generate detailed recommendations
    const recommendations = evaluationService.generateDetailedRecommendations(
      percentage,
      test.passingScore,
      analysis
    );

    // Create result document
    const resultDocument: TestResultDocument = {
      testId: submission.testId,
      studentId: submission.studentId,
      score: totalScore,
      percentage: Math.round(percentage * 100) / 100,
      correctAnswers,
      totalQuestions: test.questions.length,
      timeSpent,
      detailedResults,
      weakTopics: analysis.weakTopics,
      recommendations,
      createdAt: new Date(),
    };

    const result = await this.testResultsCollection.insertOne(resultDocument);
    resultDocument._id = result.insertedId;

    return toTestResultResponse(resultDocument);
  }

  async getTestResult(resultId: string): Promise<TestResult> {
    if (!ObjectId.isValid(resultId)) {
      throw new Error('Invalid result ID');
    }

    const result = await this.testResultsCollection.findOne({
      _id: new ObjectId(resultId),
    });

    if (!result) {
      throw new Error('Test result not found');
    }

    return toTestResultResponse(result);
  }

  async getStudentResults(
    studentId: string,
    filters?: {
      testId?: string;
      limit?: number;
    }
  ): Promise<TestResult[]> {
    const query: any = { studentId };

    if (filters?.testId) {
      query.testId = filters.testId;
    }

    const results = await this.testResultsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 20)
      .toArray();

    return results.map(toTestResultResponse);
  }

  private checkAnswer(
    userAnswer: string | string[] | undefined,
    correctAnswer: string | string[],
    questionType: string
  ): boolean {
    if (!userAnswer) {
      return false;
    }

    if (questionType === 'multiple_choice' || questionType === 'true_false') {
      // Exact match for single answer
      return this.normalizeAnswer(userAnswer as string) === 
             this.normalizeAnswer(correctAnswer as string);
    }

    if (questionType === 'open_ended') {
      // For open-ended, we do basic keyword matching
      // In production, this should use AI for evaluation
      const userText = this.normalizeAnswer(
        Array.isArray(userAnswer) ? userAnswer.join(' ') : userAnswer
      );
      const correctText = this.normalizeAnswer(
        Array.isArray(correctAnswer) ? correctAnswer.join(' ') : correctAnswer
      );

      // Simple keyword matching (at least 50% of keywords present)
      const correctKeywords = correctText.split(/\s+/).filter(w => w.length > 3);
      const userKeywords = userText.split(/\s+/);
      
      const matchCount = correctKeywords.filter(kw => 
        userKeywords.some(uk => uk.includes(kw) || kw.includes(uk))
      ).length;

      return matchCount >= correctKeywords.length * 0.5;
    }

    return false;
  }

  private normalizeAnswer(answer: string): string {
    return answer.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

}

export const testSubmissionService = new TestSubmissionService();
