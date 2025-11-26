import { query } from '../db/connection';
import { PredictionFactor } from '@ai-tutor/shared-types';

export interface Prediction {
  id: string;
  studentId: string;
  examType: string;
  predictedScore: number;
  confidence: number;
  factors: PredictionFactor[];
  recommendations: string[];
  createdAt: Date;
  validUntil?: Date;
}

export class PredictionModel {
  static async create(data: Omit<Prediction, 'id' | 'createdAt'>): Promise<Prediction> {
    const result = await query(
      `INSERT INTO predictions 
       (student_id, exam_type, predicted_score, confidence, factors, recommendations, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.studentId,
        data.examType,
        data.predictedScore,
        data.confidence,
        JSON.stringify(data.factors),
        JSON.stringify(data.recommendations),
        data.validUntil || null
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  static async findLatestByStudentAndExam(
    studentId: string,
    examType: string
  ): Promise<Prediction | null> {
    const result = await query(
      `SELECT * FROM predictions 
       WHERE student_id = $1 AND exam_type = $2
       AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [studentId, examType]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByStudent(studentId: string, limit: number = 10): Promise<Prediction[]> {
    const result = await query(
      `SELECT * FROM predictions 
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [studentId, limit]
    );
    return result.rows.map(this.mapRow);
  }

  private static mapRow(row: any): Prediction {
    return {
      id: row.id,
      studentId: row.student_id,
      examType: row.exam_type,
      predictedScore: parseFloat(row.predicted_score),
      confidence: parseFloat(row.confidence),
      factors: row.factors,
      recommendations: row.recommendations,
      createdAt: row.created_at,
      validUntil: row.valid_until
    };
  }
}
