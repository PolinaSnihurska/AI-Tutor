import { query } from '../db/connection';

export type TrendType = 'improving' | 'stable' | 'declining';

export interface TopicPerformance {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  attemptsCount: number;
  correctCount: number;
  incorrectCount: number;
  errorRate: number;
  lastAttemptAt?: Date;
  firstAttemptAt?: Date;
  trend?: TrendType;
  createdAt: Date;
  updatedAt: Date;
}

export class TopicPerformanceModel {
  static async upsert(data: {
    studentId: string;
    subject: string;
    topic: string;
    isCorrect: boolean;
  }): Promise<TopicPerformance> {
    const result = await query(
      `INSERT INTO topic_performance 
       (student_id, subject, topic, attempts_count, correct_count, incorrect_count, error_rate, last_attempt_at, first_attempt_at)
       VALUES ($1, $2, $3, 1, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, subject, topic) 
       DO UPDATE SET 
         attempts_count = topic_performance.attempts_count + 1,
         correct_count = topic_performance.correct_count + $4,
         incorrect_count = topic_performance.incorrect_count + $5,
         error_rate = CASE 
           WHEN (topic_performance.attempts_count + 1) > 0 
           THEN ((topic_performance.incorrect_count + $5)::DECIMAL / (topic_performance.attempts_count + 1)) * 100
           ELSE 0
         END,
         last_attempt_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        data.studentId,
        data.subject,
        data.topic,
        data.isCorrect ? 1 : 0,
        data.isCorrect ? 0 : 1,
        data.isCorrect ? 0 : 100
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  static async findByStudent(studentId: string): Promise<TopicPerformance[]> {
    const result = await query(
      `SELECT * FROM topic_performance 
       WHERE student_id = $1 
       ORDER BY error_rate DESC, subject, topic`,
      [studentId]
    );
    return result.rows.map(this.mapRow);
  }

  static async findByStudentAndSubject(studentId: string, subject: string): Promise<TopicPerformance[]> {
    const result = await query(
      `SELECT * FROM topic_performance 
       WHERE student_id = $1 AND subject = $2
       ORDER BY error_rate DESC, topic`,
      [studentId, subject]
    );
    return result.rows.map(this.mapRow);
  }

  static async updateTrends(studentId: string): Promise<void> {
    // Calculate trends based on recent performance
    await query(
      `UPDATE topic_performance tp
       SET trend = CASE
         WHEN recent_error_rate < (error_rate - 10) THEN 'improving'::VARCHAR
         WHEN recent_error_rate > (error_rate + 10) THEN 'declining'::VARCHAR
         ELSE 'stable'::VARCHAR
       END
       FROM (
         SELECT 
           student_id,
           subject,
           topic,
           AVG(CASE WHEN correct THEN 0 ELSE 100 END) as recent_error_rate
         FROM (
           SELECT 
             sa.student_id,
             sa.subject,
             sa.topic,
             (sa.metadata->>'correct')::boolean as correct,
             ROW_NUMBER() OVER (PARTITION BY sa.student_id, sa.subject, sa.topic ORDER BY sa.created_at DESC) as rn
           FROM student_activities sa
           WHERE sa.student_id = $1
           AND sa.activity_type = 'test_completed'
           AND sa.subject IS NOT NULL
           AND sa.topic IS NOT NULL
         ) recent
         WHERE rn <= 5
         GROUP BY student_id, subject, topic
       ) trends
       WHERE tp.student_id = trends.student_id
       AND tp.subject = trends.subject
       AND tp.topic = trends.topic
       AND tp.student_id = $1`,
      [studentId]
    );
  }

  private static mapRow(row: any): TopicPerformance {
    return {
      id: row.id,
      studentId: row.student_id,
      subject: row.subject,
      topic: row.topic,
      attemptsCount: row.attempts_count,
      correctCount: row.correct_count,
      incorrectCount: row.incorrect_count,
      errorRate: parseFloat(row.error_rate),
      lastAttemptAt: row.last_attempt_at,
      firstAttemptAt: row.first_attempt_at,
      trend: row.trend,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
