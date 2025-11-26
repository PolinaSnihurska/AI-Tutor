import { Question } from '@ai-tutor/shared-types';
import { testService } from './testService';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface StudentPerformanceProfile {
  studentId: string;
  currentLevel: number; // 1-10 difficulty level
  topicMastery: { [topic: string]: number }; // 0-1 mastery score
  recentPerformance: number[]; // Last N question results (1 for correct, 0 for incorrect)
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
}

export class AdaptiveQuestioningService {
  private readonly PERFORMANCE_WINDOW = 5; // Consider last 5 questions
  private readonly LEVEL_UP_THRESHOLD = 3; // Consecutive correct to level up
  private readonly LEVEL_DOWN_THRESHOLD = 2; // Consecutive incorrect to level down

  /**
   * Get the next adaptive question based on student performance
   */
  async getNextQuestion(
    studentId: string,
    subject: string,
    topics: string[],
    currentProfile?: StudentPerformanceProfile
  ): Promise<Question> {
    // Get or create student profile
    const profile = currentProfile || await this.getStudentProfile(studentId, subject, topics);

    // Determine next difficulty level
    const nextDifficulty = this.calculateNextDifficulty(profile);

    // Select topic based on mastery
    const nextTopic = this.selectNextTopic(topics, profile);

    // Generate question at appropriate difficulty
    const question = await this.generateAdaptiveQuestion(
      subject,
      nextTopic,
      nextDifficulty,
      profile.currentLevel
    );

    return question;
  }

  /**
   * Update student profile based on answer result
   */
  updateProfile(
    profile: StudentPerformanceProfile,
    question: Question,
    isCorrect: boolean
  ): StudentPerformanceProfile {
    // Update recent performance
    const recentPerformance = [
      ...profile.recentPerformance,
      isCorrect ? 1 : 0,
    ].slice(-this.PERFORMANCE_WINDOW);

    // Update consecutive counters
    let consecutiveCorrect = isCorrect ? profile.consecutiveCorrect + 1 : 0;
    let consecutiveIncorrect = !isCorrect ? profile.consecutiveIncorrect + 1 : 0;

    // Update topic mastery
    const topicMastery = { ...profile.topicMastery };
    const currentMastery = topicMastery[question.topic] || 0.5;
    
    // Adjust mastery based on result and difficulty
    const masteryChange = this.calculateMasteryChange(
      isCorrect,
      question.difficulty,
      profile.currentLevel
    );
    
    topicMastery[question.topic] = Math.max(
      0,
      Math.min(1, currentMastery + masteryChange)
    );

    // Adjust current level based on performance
    let currentLevel = profile.currentLevel;
    if (consecutiveCorrect >= this.LEVEL_UP_THRESHOLD && currentLevel < 10) {
      currentLevel++;
      consecutiveCorrect = 0;
    } else if (consecutiveIncorrect >= this.LEVEL_DOWN_THRESHOLD && currentLevel > 1) {
      currentLevel--;
      consecutiveIncorrect = 0;
    }

    return {
      ...profile,
      currentLevel,
      topicMastery,
      recentPerformance,
      consecutiveCorrect,
      consecutiveIncorrect,
    };
  }

  /**
   * Generate an adaptive test based on student profile
   */
  async generateAdaptiveTest(
    studentId: string,
    subject: string,
    topics: string[],
    questionCount: number
  ): Promise<Question[]> {
    const profile = await this.getStudentProfile(studentId, subject, topics);
    const questions: Question[] = [];

    let currentProfile = profile;

    for (let i = 0; i < questionCount; i++) {
      const question = await this.getNextQuestion(
        studentId,
        subject,
        topics,
        currentProfile
      );

      questions.push(question);

      // Simulate average performance for planning
      // In real scenario, this would be updated as student answers
      const simulatedCorrect = Math.random() < this.estimateSuccessProbability(
        currentProfile,
        question
      );
      
      currentProfile = this.updateProfile(currentProfile, question, simulatedCorrect);
    }

    return questions;
  }

  /**
   * Get student performance profile
   */
  private async getStudentProfile(
    studentId: string,
    subject: string,
    topics: string[]
  ): Promise<StudentPerformanceProfile> {
    // In production, this would fetch from database
    // For now, calculate from recent test results
    
    try {
      const response = await axios.get(
        `http://localhost:3003/tests/results/${studentId}?limit=10`
      );
      
      const results = response.data;
      
      if (results.length === 0) {
        // New student - start at medium difficulty
        return this.createDefaultProfile(studentId, topics);
      }

      // Calculate profile from recent results
      return this.calculateProfileFromResults(studentId, results, topics);
    } catch (error) {
      console.error('Error fetching student profile:', error);
      return this.createDefaultProfile(studentId, topics);
    }
  }

  private createDefaultProfile(
    studentId: string,
    topics: string[]
  ): StudentPerformanceProfile {
    const topicMastery: { [topic: string]: number } = {};
    topics.forEach(topic => {
      topicMastery[topic] = 0.5; // Start at 50% mastery
    });

    return {
      studentId,
      currentLevel: 5, // Start at medium difficulty
      topicMastery,
      recentPerformance: [],
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
    };
  }

  private calculateProfileFromResults(
    studentId: string,
    results: any[],
    topics: string[]
  ): StudentPerformanceProfile {
    const topicMastery: { [topic: string]: number } = {};
    const recentPerformance: number[] = [];
    
    // Initialize topic mastery
    topics.forEach(topic => {
      topicMastery[topic] = 0.5;
    });

    // Calculate from recent results
    let totalCorrect = 0;
    let totalQuestions = 0;

    results.forEach(result => {
      totalCorrect += result.correctAnswers;
      totalQuestions += result.totalQuestions;

      // Update topic mastery from weak topics
      result.weakTopics?.forEach((topic: string) => {
        if (topics.includes(topic)) {
          topicMastery[topic] = Math.max(0, (topicMastery[topic] || 0.5) - 0.1);
        }
      });

      // Add to recent performance
      const successRate = result.correctAnswers / result.totalQuestions;
      recentPerformance.push(successRate > 0.7 ? 1 : 0);
    });

    const overallSuccessRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0.5;
    
    // Estimate current level from success rate
    const currentLevel = Math.max(1, Math.min(10, Math.round(overallSuccessRate * 10)));

    return {
      studentId,
      currentLevel,
      topicMastery,
      recentPerformance: recentPerformance.slice(-this.PERFORMANCE_WINDOW),
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
    };
  }

  private calculateNextDifficulty(profile: StudentPerformanceProfile): number {
    const recentSuccessRate = profile.recentPerformance.length > 0
      ? profile.recentPerformance.reduce((a, b) => a + b, 0) / profile.recentPerformance.length
      : 0.5;

    let difficulty = profile.currentLevel;

    // Adjust based on recent performance
    if (recentSuccessRate > 0.8) {
      difficulty = Math.min(10, difficulty + 1);
    } else if (recentSuccessRate < 0.4) {
      difficulty = Math.max(1, difficulty - 1);
    }

    return difficulty;
  }

  private selectNextTopic(
    topics: string[],
    profile: StudentPerformanceProfile
  ): string {
    // Select topic with lowest mastery (needs most practice)
    let lowestMastery = 1;
    let selectedTopic = topics[0];

    topics.forEach(topic => {
      const mastery = profile.topicMastery[topic] || 0.5;
      if (mastery < lowestMastery) {
        lowestMastery = mastery;
        selectedTopic = topic;
      }
    });

    // 20% chance to select a random topic for variety
    if (Math.random() < 0.2) {
      selectedTopic = topics[Math.floor(Math.random() * topics.length)];
    }

    return selectedTopic;
  }

  private calculateMasteryChange(
    isCorrect: boolean,
    questionDifficulty: number,
    studentLevel: number
  ): number {
    // Larger changes for questions at appropriate difficulty
    const difficultyDelta = Math.abs(questionDifficulty - studentLevel);
    const baseChange = 0.1;
    
    // Reduce change if question is too easy or too hard
    const difficultyFactor = Math.max(0.5, 1 - (difficultyDelta / 10));
    
    const change = baseChange * difficultyFactor;
    
    return isCorrect ? change : -change;
  }

  private async generateAdaptiveQuestion(
    subject: string,
    topic: string,
    difficulty: number,
    studentLevel: number
  ): Promise<Question> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/tests/generate`, {
        subject,
        topics: [topic],
        difficulty,
        question_count: 1,
        question_types: ['multiple_choice'],
        student_level: studentLevel,
      });

      const generatedTest = response.data;
      const question = generatedTest.questions[0];

      return {
        id: question.id,
        type: question.type,
        content: question.content,
        options: question.options,
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
        difficulty: question.difficulty,
        topic: question.topic,
        points: question.points,
      };
    } catch (error) {
      console.error('Error generating adaptive question:', error);
      throw new Error('Failed to generate adaptive question');
    }
  }

  private estimateSuccessProbability(
    profile: StudentPerformanceProfile,
    question: Question
  ): number {
    const topicMastery = profile.topicMastery[question.topic] || 0.5;
    const levelDifference = profile.currentLevel - question.difficulty;
    
    // Base probability from topic mastery
    let probability = topicMastery;
    
    // Adjust based on difficulty relative to student level
    probability += levelDifference * 0.05;
    
    // Clamp between 0.1 and 0.9
    return Math.max(0.1, Math.min(0.9, probability));
  }
}

export const adaptiveQuestioningService = new AdaptiveQuestioningService();
