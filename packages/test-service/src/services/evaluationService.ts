import axios from 'axios';
import { Question, QuestionResult } from '@ai-tutor/shared-types';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export class EvaluationService {
  /**
   * Evaluate an open-ended answer using AI
   */
  async evaluateOpenEndedAnswer(
    question: Question,
    userAnswer: string
  ): Promise<{ isCorrect: boolean; feedback: string; score: number }> {
    try {
      const prompt = this.buildEvaluationPrompt(question, userAnswer);
      
      const response = await axios.post(`${AI_SERVICE_URL}/explanations/generate`, {
        topic: 'Answer Evaluation',
        subject: 'Evaluation',
        student_level: 10,
        context: prompt,
      });

      // Parse AI response to extract evaluation
      const evaluation = this.parseEvaluationResponse(response.data.content);
      
      return evaluation;
    } catch (error) {
      console.error('Error evaluating open-ended answer:', error);
      // Fallback to keyword matching
      return this.fallbackEvaluation(question, userAnswer);
    }
  }

  /**
   * Analyze test results to identify patterns and weak areas
   */
  analyzeTestPerformance(
    questions: Question[],
    results: QuestionResult[]
  ): {
    weakTopics: string[];
    strongTopics: string[];
    difficultyAnalysis: { [key: number]: { correct: number; total: number } };
    topicAnalysis: { [topic: string]: { correct: number; total: number; errorRate: number } };
  } {
    const topicStats: { [topic: string]: { correct: number; total: number } } = {};
    const difficultyStats: { [key: number]: { correct: number; total: number } } = {};

    questions.forEach((question, index) => {
      const result = results[index];
      const topic = question.topic;
      const difficulty = question.difficulty;

      // Topic statistics
      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0 };
      }
      topicStats[topic].total++;
      if (result.correct) {
        topicStats[topic].correct++;
      }

      // Difficulty statistics
      if (!difficultyStats[difficulty]) {
        difficultyStats[difficulty] = { correct: 0, total: 0 };
      }
      difficultyStats[difficulty].total++;
      if (result.correct) {
        difficultyStats[difficulty].correct++;
      }
    });

    // Calculate error rates and identify weak/strong topics
    const topicAnalysis: { [topic: string]: { correct: number; total: number; errorRate: number } } = {};
    const weakTopics: string[] = [];
    const strongTopics: string[] = [];

    Object.entries(topicStats).forEach(([topic, stats]) => {
      const errorRate = 1 - (stats.correct / stats.total);
      topicAnalysis[topic] = { ...stats, errorRate };

      if (errorRate > 0.5) {
        weakTopics.push(topic);
      } else if (errorRate < 0.2) {
        strongTopics.push(topic);
      }
    });

    return {
      weakTopics,
      strongTopics,
      difficultyAnalysis: difficultyStats,
      topicAnalysis,
    };
  }

  /**
   * Generate personalized recommendations based on test performance
   */
  generateDetailedRecommendations(
    percentage: number,
    passingScore: number,
    analysis: {
      weakTopics: string[];
      strongTopics: string[];
      difficultyAnalysis: { [key: number]: { correct: number; total: number } };
      topicAnalysis: { [topic: string]: { correct: number; total: number; errorRate: number } };
    }
  ): string[] {
    const recommendations: string[] = [];

    // Overall performance feedback
    if (percentage >= 90) {
      recommendations.push('🎉 Outstanding performance! You have excellent mastery of this material.');
    } else if (percentage >= passingScore) {
      recommendations.push(`✅ Good job! You passed with ${percentage.toFixed(1)}%.`);
    } else {
      recommendations.push(
        `📚 You scored ${percentage.toFixed(1)}%, which is below the passing score of ${passingScore}%. Keep practicing!`
      );
    }

    // Strong topics recognition
    if (analysis.strongTopics.length > 0) {
      recommendations.push(
        `💪 Strong areas: ${analysis.strongTopics.join(', ')}. Great work on these topics!`
      );
    }

    // Weak topics guidance
    if (analysis.weakTopics.length > 0) {
      recommendations.push(
        `🎯 Focus areas: ${analysis.weakTopics.join(', ')}. These topics need more attention.`
      );

      // Specific recommendations for each weak topic
      analysis.weakTopics.forEach(topic => {
        const stats = analysis.topicAnalysis[topic];
        const errorRate = (stats.errorRate * 100).toFixed(0);
        recommendations.push(
          `  • ${topic}: ${errorRate}% error rate. Review the fundamentals and practice more questions.`
        );
      });
    }

    // Difficulty-based recommendations
    const difficultyLevels = Object.keys(analysis.difficultyAnalysis)
      .map(Number)
      .sort((a, b) => a - b);

    if (difficultyLevels.length > 0) {
      const hardestLevel = difficultyLevels[difficultyLevels.length - 1];
      const hardestStats = analysis.difficultyAnalysis[hardestLevel];
      const hardestSuccessRate = (hardestStats.correct / hardestStats.total) * 100;

      if (hardestSuccessRate < 50) {
        recommendations.push(
          `📈 Challenge yourself gradually. Focus on mastering medium difficulty questions before tackling harder ones.`
        );
      } else if (hardestSuccessRate > 80 && percentage >= 85) {
        recommendations.push(
          `🚀 You're ready for more challenging material! Consider increasing the difficulty level.`
        );
      }
    }

    // Study strategy recommendations
    if (percentage < passingScore) {
      recommendations.push(
        `📖 Study strategy: Break down complex topics into smaller parts and practice regularly.`
      );
      recommendations.push(
        `💡 Tip: Use the AI tutor to get explanations for topics you find difficult.`
      );
    }

    // Next steps
    if (percentage >= passingScore && analysis.weakTopics.length === 0) {
      recommendations.push(
        `✨ Next steps: You're doing great! Try a practice test on related topics to expand your knowledge.`
      );
    } else if (analysis.weakTopics.length > 0) {
      recommendations.push(
        `📝 Next steps: Review materials on ${analysis.weakTopics[0]}, then take another practice test to track improvement.`
      );
    }

    return recommendations;
  }

  private buildEvaluationPrompt(question: Question, userAnswer: string): string {
    const correctAnswer = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.join(', ')
      : question.correctAnswer;

    return `Evaluate this student answer:

Question: ${question.content}
Expected Answer: ${correctAnswer}
Student Answer: ${userAnswer}

Provide:
1. SCORE: 0-100 (how well the answer matches the expected answer)
2. CORRECT: YES or NO (is the answer fundamentally correct?)
3. FEEDBACK: Brief explanation of what's right/wrong

Format your response as:
SCORE: [number]
CORRECT: [YES/NO]
FEEDBACK: [explanation]`;
  }

  private parseEvaluationResponse(content: string): {
    isCorrect: boolean;
    feedback: string;
    score: number;
  } {
    const scoreMatch = content.match(/SCORE:\s*(\d+)/i);
    const correctMatch = content.match(/CORRECT:\s*(YES|NO)/i);
    const feedbackMatch = content.match(/FEEDBACK:\s*(.+)/is);

    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
    const isCorrect = correctMatch ? correctMatch[1].toUpperCase() === 'YES' : score >= 70;
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'Answer evaluated.';

    return { isCorrect, feedback, score };
  }

  private fallbackEvaluation(question: Question, userAnswer: string): {
    isCorrect: boolean;
    feedback: string;
    score: number;
  } {
    const correctAnswer = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.join(' ')
      : question.correctAnswer;

    const userText = this.normalizeText(userAnswer);
    const correctText = this.normalizeText(correctAnswer);

    // Extract keywords (words longer than 3 characters)
    const correctKeywords = correctText.split(/\s+/).filter(w => w.length > 3);
    const userKeywords = userText.split(/\s+/);

    // Calculate keyword match percentage
    const matchCount = correctKeywords.filter(kw =>
      userKeywords.some(uk => uk.includes(kw) || kw.includes(uk))
    ).length;

    const matchPercentage = correctKeywords.length > 0
      ? (matchCount / correctKeywords.length) * 100
      : 0;

    const isCorrect = matchPercentage >= 50;
    const score = Math.round(matchPercentage);

    let feedback = '';
    if (matchPercentage >= 80) {
      feedback = 'Excellent answer! You covered the key points.';
    } else if (matchPercentage >= 50) {
      feedback = 'Good answer, but could include more details.';
    } else {
      feedback = 'Your answer is missing key concepts. Review the topic and try again.';
    }

    return { isCorrect, feedback, score };
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }
}

export const evaluationService = new EvaluationService();
