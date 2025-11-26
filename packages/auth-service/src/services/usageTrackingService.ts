import { query } from '../db/connection';
import { SUBSCRIPTION_TIERS } from '@ai-tutor/shared-types';

export interface UsageStats {
  aiQueries: number;
  testsTaken: number;
  studyMinutes: number;
  date: Date;
}

export class UsageTrackingService {
  /**
   * Get today's usage for a user
   */
  static async getTodayUsage(userId: string): Promise<UsageStats> {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await query(
      `SELECT ai_queries, tests_taken, study_minutes, date
       FROM usage_tracking
       WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );
    
    if (result.rows.length === 0) {
      return {
        aiQueries: 0,
        testsTaken: 0,
        studyMinutes: 0,
        date: new Date(today),
      };
    }
    
    return {
      aiQueries: result.rows[0].ai_queries,
      testsTaken: result.rows[0].tests_taken,
      studyMinutes: result.rows[0].study_minutes,
      date: result.rows[0].date,
    };
  }

  /**
   * Increment AI query count
   */
  static async incrementAIQueries(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await query(
      `INSERT INTO usage_tracking (user_id, date, ai_queries, tests_taken, study_minutes)
       VALUES ($1, $2, 1, 0, 0)
       ON CONFLICT (user_id, date)
       DO UPDATE SET ai_queries = usage_tracking.ai_queries + 1`,
      [userId, today]
    );
  }

  /**
   * Increment test count
   */
  static async incrementTests(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await query(
      `INSERT INTO usage_tracking (user_id, date, ai_queries, tests_taken, study_minutes)
       VALUES ($1, $2, 0, 1, 0)
       ON CONFLICT (user_id, date)
       DO UPDATE SET tests_taken = usage_tracking.tests_taken + 1`,
      [userId, today]
    );
  }

  /**
   * Add study minutes
   */
  static async addStudyMinutes(userId: string, minutes: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await query(
      `INSERT INTO usage_tracking (user_id, date, ai_queries, tests_taken, study_minutes)
       VALUES ($1, $2, 0, 0, $3)
       ON CONFLICT (user_id, date)
       DO UPDATE SET study_minutes = usage_tracking.study_minutes + $3`,
      [userId, today, minutes]
    );
  }

  /**
   * Check if user has exceeded their daily AI query limit
   */
  static async checkAIQueryLimit(userId: string, plan: string): Promise<{ allowed: boolean; remaining: number }> {
    const usage = await this.getTodayUsage(userId);
    const limit = SUBSCRIPTION_TIERS[plan as keyof typeof SUBSCRIPTION_TIERS].aiQueriesPerDay;
    
    if (limit === 'unlimited') {
      return { allowed: true, remaining: -1 };
    }
    
    const remaining = Math.max(0, limit - usage.aiQueries);
    return {
      allowed: usage.aiQueries < limit,
      remaining,
    };
  }

  /**
   * Check if user has exceeded their daily test limit
   */
  static async checkTestLimit(userId: string, plan: string): Promise<{ allowed: boolean; remaining: number }> {
    const usage = await this.getTodayUsage(userId);
    const limit = SUBSCRIPTION_TIERS[plan as keyof typeof SUBSCRIPTION_TIERS].testsPerDay;
    
    if (limit === 'unlimited') {
      return { allowed: true, remaining: -1 };
    }
    
    const remaining = Math.max(0, limit - usage.testsTaken);
    return {
      allowed: usage.testsTaken < limit,
      remaining,
    };
  }

  /**
   * Get usage statistics for a date range
   */
  static async getUsageStats(userId: string, startDate: Date, endDate: Date): Promise<UsageStats[]> {
    const result = await query(
      `SELECT ai_queries, tests_taken, study_minutes, date
       FROM usage_tracking
       WHERE user_id = $1 AND date BETWEEN $2 AND $3
       ORDER BY date ASC`,
      [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    
    return result.rows.map(row => ({
      aiQueries: row.ai_queries,
      testsTaken: row.tests_taken,
      studyMinutes: row.study_minutes,
      date: row.date,
    }));
  }
}
