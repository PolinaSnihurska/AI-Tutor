import { query } from '../db/connection';
import { SubjectScore } from '@ai-tutor/shared-types';

export interface AnalyticsSnapshot {
  id: string;
  studentId: string;
  snapshotDate: Date;
  overallScore: number;
  subjectScores: SubjectScore[];
  testsCompleted: number;
  studyTime: number;
  improvementRate: number;
  consistency: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AnalyticsSnapshotModel {
  static async create(data: Omit<AnalyticsSnapshot, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnalyticsSnapshot> {
    const result = await query(
      `INSERT INTO analytics_snapshots 
       (student_id, snapshot_date, overall_score, subject_scores, tests_completed, study_time, improvement_rate, consistency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (student_id, snapshot_date) 
       DO UPDATE SET 
         overall_score = EXCLUDED.overall_score,
         subject_scores = EXCLUDED.subject_scores,
         tests_completed = EXCLUDED.tests_completed,
         study_time = EXCLUDED.study_time,
         improvement_rate = EXCLUDED.improvement_rate,
         consistency = EXCLUDED.consistency,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        data.studentId,
        data.snapshotDate,
        data.overallScore,
        JSON.stringify(data.subjectScores),
        data.testsCompleted,
        data.studyTime,
        data.improvementRate,
        data.consistency
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  static async findByStudentAndDateRange(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsSnapshot[]> {
    const result = await query(
      `SELECT * FROM analytics_snapshots 
       WHERE student_id = $1 
       AND snapshot_date BETWEEN $2 AND $3
       ORDER BY snapshot_date DESC`,
      [studentId, startDate, endDate]
    );
    return result.rows.map(this.mapRow);
  }

  static async findLatestByStudent(studentId: string): Promise<AnalyticsSnapshot | null> {
    const result = await query(
      `SELECT * FROM analytics_snapshots 
       WHERE student_id = $1 
       ORDER BY snapshot_date DESC 
       LIMIT 1`,
      [studentId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByStudentAndDate(studentId: string, date: Date): Promise<AnalyticsSnapshot | null> {
    const result = await query(
      `SELECT * FROM analytics_snapshots 
       WHERE student_id = $1 AND snapshot_date = $2`,
      [studentId, date]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  private static mapRow(row: any): AnalyticsSnapshot {
    return {
      id: row.id,
      studentId: row.student_id,
      snapshotDate: row.snapshot_date,
      overallScore: parseFloat(row.overall_score),
      subjectScores: row.subject_scores,
      testsCompleted: row.tests_completed,
      studyTime: row.study_time,
      improvementRate: row.improvement_rate ? parseFloat(row.improvement_rate) : 0,
      consistency: row.consistency ? parseFloat(row.consistency) : 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
