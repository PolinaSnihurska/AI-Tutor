import { query } from '../db/connection';

export type ActivityType = 
  | 'test_completed' 
  | 'lesson_viewed' 
  | 'explanation_requested' 
  | 'task_completed' 
  | 'login' 
  | 'study_session';

export interface StudentActivity {
  id: string;
  studentId: string;
  activityType: ActivityType;
  subject?: string;
  topic?: string;
  metadata: Record<string, any>;
  durationMinutes?: number;
  score?: number;
  createdAt: Date;
}

export class StudentActivityModel {
  static async create(data: Omit<StudentActivity, 'id' | 'createdAt'>): Promise<StudentActivity> {
    const result = await query(
      `INSERT INTO student_activities 
       (student_id, activity_type, subject, topic, metadata, duration_minutes, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.studentId,
        data.activityType,
        data.subject || null,
        data.topic || null,
        JSON.stringify(data.metadata),
        data.durationMinutes || null,
        data.score || null
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  static async findByStudentAndDateRange(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StudentActivity[]> {
    const result = await query(
      `SELECT * FROM student_activities 
       WHERE student_id = $1 
       AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC`,
      [studentId, startDate, endDate]
    );
    return result.rows.map(this.mapRow);
  }

  static async findByStudentAndType(
    studentId: string,
    activityType: ActivityType,
    limit: number = 100
  ): Promise<StudentActivity[]> {
    const result = await query(
      `SELECT * FROM student_activities 
       WHERE student_id = $1 AND activity_type = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [studentId, activityType, limit]
    );
    return result.rows.map(this.mapRow);
  }

  static async getStudyTimeByDate(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; minutes: number }[]> {
    const result = await query(
      `SELECT 
         DATE(created_at) as date,
         SUM(duration_minutes) as minutes
       FROM student_activities 
       WHERE student_id = $1 
       AND created_at BETWEEN $2 AND $3
       AND duration_minutes IS NOT NULL
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [studentId, startDate, endDate]
    );
    return result.rows.map(row => ({
      date: row.date,
      minutes: parseInt(row.minutes)
    }));
  }

  private static mapRow(row: any): StudentActivity {
    return {
      id: row.id,
      studentId: row.student_id,
      activityType: row.activity_type,
      subject: row.subject,
      topic: row.topic,
      metadata: row.metadata,
      durationMinutes: row.duration_minutes,
      score: row.score ? parseFloat(row.score) : undefined,
      createdAt: row.created_at
    };
  }
}
