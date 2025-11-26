import { query } from '../db/connection';

interface UserActivityRow {
  id: string;
  user_id: string;
  activity_date: Date;
  login_times: Date[];
  active_hours: number[];
  tasks_completed: number;
  study_minutes: number;
  last_activity: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserActivityPattern {
  userId: string;
  preferredHours: number[];
  averageLoginTime: Date | null;
  mostActiveHour: number | null;
  activityScore: number;
}

export class UserActivityService {
  /**
   * Record user login
   */
  async recordLogin(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();

    await query(
      `INSERT INTO user_activity (user_id, activity_date, login_times, active_hours, last_activity)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET 
         login_times = user_activity.login_times || $3,
         active_hours = CASE 
           WHEN user_activity.active_hours::jsonb ? $6::text THEN user_activity.active_hours
           ELSE user_activity.active_hours || $7
         END,
         last_activity = $5,
         updated_at = NOW()`,
      [
        userId,
        today,
        JSON.stringify([now]),
        JSON.stringify([currentHour]),
        now,
        currentHour.toString(),
        JSON.stringify([currentHour]),
      ]
    );
  }

  /**
   * Record task completion
   */
  async recordTaskCompletion(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    await query(
      `INSERT INTO user_activity (user_id, activity_date, tasks_completed, last_activity)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET 
         tasks_completed = user_activity.tasks_completed + 1,
         last_activity = $3,
         updated_at = NOW()`,
      [userId, today, now]
    );
  }

  /**
   * Record study time
   */
  async recordStudyTime(userId: string, minutes: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    await query(
      `INSERT INTO user_activity (user_id, activity_date, study_minutes, last_activity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET 
         study_minutes = user_activity.study_minutes + $3,
         last_activity = $4,
         updated_at = NOW()`,
      [userId, today, minutes, now]
    );
  }

  /**
   * Get user activity pattern for intelligent reminder scheduling
   */
  async getUserActivityPattern(userId: string, daysBack: number = 14): Promise<UserActivityPattern> {
    const result = await query(
      `SELECT 
         user_id,
         login_times,
         active_hours,
         tasks_completed,
         study_minutes,
         last_activity
       FROM user_activity
       WHERE user_id = $1
       AND activity_date >= CURRENT_DATE - INTERVAL '${daysBack} days'
       ORDER BY activity_date DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        userId,
        preferredHours: [9, 14, 18], // Default reminder times
        averageLoginTime: null,
        mostActiveHour: null,
        activityScore: 0,
      };
    }

    // Analyze activity patterns
    const allActiveHours: number[] = [];
    const allLoginTimes: Date[] = [];
    let totalTasksCompleted = 0;
    let totalStudyMinutes = 0;

    for (const row of result.rows) {
      if (row.active_hours) {
        allActiveHours.push(...row.active_hours);
      }
      if (row.login_times) {
        allLoginTimes.push(...row.login_times.map((t: string) => new Date(t)));
      }
      totalTasksCompleted += row.tasks_completed || 0;
      totalStudyMinutes += row.study_minutes || 0;
    }

    // Find most common active hours
    const hourFrequency: Record<number, number> = {};
    allActiveHours.forEach(hour => {
      hourFrequency[hour] = (hourFrequency[hour] || 0) + 1;
    });

    const sortedHours = Object.entries(hourFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([hour]) => parseInt(hour));

    const preferredHours = sortedHours.slice(0, 3);
    if (preferredHours.length === 0) {
      preferredHours.push(9, 14, 18); // Default times
    }

    // Calculate average login time
    let averageLoginTime: Date | null = null;
    if (allLoginTimes.length > 0) {
      const avgHour = allLoginTimes.reduce((sum, time) => sum + time.getHours(), 0) / allLoginTimes.length;
      const avgMinute = allLoginTimes.reduce((sum, time) => sum + time.getMinutes(), 0) / allLoginTimes.length;
      averageLoginTime = new Date();
      averageLoginTime.setHours(Math.round(avgHour), Math.round(avgMinute), 0, 0);
    }

    // Calculate activity score (0-100)
    const daysActive = result.rows.length;
    const avgTasksPerDay = totalTasksCompleted / daysBack;
    const avgStudyMinutesPerDay = totalStudyMinutes / daysBack;
    const activityScore = Math.min(100, 
      (daysActive / daysBack) * 40 + 
      Math.min(avgTasksPerDay * 10, 30) + 
      Math.min(avgStudyMinutesPerDay / 3, 30)
    );

    return {
      userId,
      preferredHours,
      averageLoginTime,
      mostActiveHour: sortedHours[0] || null,
      activityScore: Math.round(activityScore),
    };
  }

  /**
   * Get last activity time for a user
   */
  async getLastActivity(userId: string): Promise<Date | null> {
    const result = await query(
      `SELECT last_activity FROM user_activity
       WHERE user_id = $1
       ORDER BY last_activity DESC
       LIMIT 1`,
      [userId]
    );

    return result.rows[0]?.last_activity || null;
  }

  /**
   * Check if user is active (has activity in last N days)
   */
  async isUserActive(userId: string, daysThreshold: number = 3): Promise<boolean> {
    const result = await query(
      `SELECT COUNT(*) as count FROM user_activity
       WHERE user_id = $1
       AND activity_date >= CURRENT_DATE - INTERVAL '${daysThreshold} days'`,
      [userId]
    );

    return parseInt(result.rows[0]?.count || '0') > 0;
  }
}
