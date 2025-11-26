import { z } from 'zod';
import { query } from '../db/connection';
import { LearningPlan, Task, Goal } from '@ai-tutor/shared-types';

// Validation schemas
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  type: z.enum(['lesson', 'test', 'practice']),
  estimatedTime: z.number(),
  priority: z.enum(['high', 'medium', 'low']),
  status: z.enum(['pending', 'in_progress', 'completed']),
  dueDate: z.date(),
  description: z.string().optional(),
});

const GoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetDate: z.date(),
  completed: z.boolean(),
  progress: z.number(),
});

export const CreateLearningPlanSchema = z.object({
  studentId: z.string().uuid(),
  examType: z.string().optional(),
  examDate: z.date().optional(),
  subjects: z.array(z.string()).default([]),
  dailyTasks: z.array(TaskSchema).default([]),
  weeklyGoals: z.array(GoalSchema).default([]),
});

export const UpdateLearningPlanSchema = CreateLearningPlanSchema.partial().omit({ studentId: true });

export interface LearningPlanRow {
  id: string;
  student_id: string;
  exam_type: string | null;
  exam_date: Date | null;
  subjects: string[];
  daily_tasks: Task[];
  weekly_goals: Goal[];
  completion_rate: number;
  created_at: Date;
  updated_at: Date;
}

export class LearningPlanModel {
  static async create(data: z.infer<typeof CreateLearningPlanSchema>): Promise<LearningPlan> {
    const validated = CreateLearningPlanSchema.parse(data);
    
    const result = await query(
      `INSERT INTO learning_plans (
        student_id, exam_type, exam_date, subjects, daily_tasks, weekly_goals, completion_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        validated.studentId,
        validated.examType || null,
        validated.examDate || null,
        JSON.stringify(validated.subjects),
        JSON.stringify(validated.dailyTasks),
        JSON.stringify(validated.weeklyGoals),
        0,
      ]
    );
    
    return this.rowToLearningPlan(result.rows[0]);
  }

  static async findById(id: string): Promise<LearningPlan | null> {
    const result = await query('SELECT * FROM learning_plans WHERE id = $1', [id]);
    return result.rows[0] ? this.rowToLearningPlan(result.rows[0]) : null;
  }

  static async findByStudentId(studentId: string): Promise<LearningPlan[]> {
    const result = await query(
      'SELECT * FROM learning_plans WHERE student_id = $1 ORDER BY created_at DESC',
      [studentId]
    );
    return result.rows.map(row => this.rowToLearningPlan(row));
  }

  static async findActiveByStudentId(studentId: string): Promise<LearningPlan | null> {
    const result = await query(
      `SELECT * FROM learning_plans 
       WHERE student_id = $1 
       AND (exam_date IS NULL OR exam_date >= CURRENT_DATE)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [studentId]
    );
    return result.rows[0] ? this.rowToLearningPlan(result.rows[0]) : null;
  }

  static async update(id: string, data: z.infer<typeof UpdateLearningPlanSchema>): Promise<LearningPlan | null> {
    const validated = UpdateLearningPlanSchema.parse(data);
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (validated.examType !== undefined) {
      fields.push(`exam_type = $${paramCount++}`);
      values.push(validated.examType);
    }
    if (validated.examDate !== undefined) {
      fields.push(`exam_date = $${paramCount++}`);
      values.push(validated.examDate);
    }
    if (validated.subjects !== undefined) {
      fields.push(`subjects = $${paramCount++}`);
      values.push(JSON.stringify(validated.subjects));
    }
    if (validated.dailyTasks !== undefined) {
      fields.push(`daily_tasks = $${paramCount++}`);
      values.push(JSON.stringify(validated.dailyTasks));
    }
    if (validated.weeklyGoals !== undefined) {
      fields.push(`weekly_goals = $${paramCount++}`);
      values.push(JSON.stringify(validated.weeklyGoals));
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE learning_plans SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows[0] ? this.rowToLearningPlan(result.rows[0]) : null;
  }

  static async updateTasks(id: string, tasks: Task[]): Promise<LearningPlan | null> {
    const result = await query(
      'UPDATE learning_plans SET daily_tasks = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(tasks), id]
    );
    return result.rows[0] ? this.rowToLearningPlan(result.rows[0]) : null;
  }

  static async updateGoals(id: string, goals: Goal[]): Promise<LearningPlan | null> {
    const result = await query(
      'UPDATE learning_plans SET weekly_goals = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(goals), id]
    );
    return result.rows[0] ? this.rowToLearningPlan(result.rows[0]) : null;
  }

  static async updateCompletionRate(id: string): Promise<LearningPlan | null> {
    // Get the plan first to calculate completion rate
    const plan = await this.findById(id);
    if (!plan) return null;

    const totalTasks = plan.dailyTasks.length;
    if (totalTasks === 0) {
      return plan;
    }

    const completedTasks = plan.dailyTasks.filter(task => task.status === 'completed').length;
    const completionRate = (completedTasks / totalTasks) * 100;

    const result = await query(
      'UPDATE learning_plans SET completion_rate = $1 WHERE id = $2 RETURNING *',
      [completionRate, id]
    );
    
    return result.rows[0] ? this.rowToLearningPlan(result.rows[0]) : null;
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM learning_plans WHERE id = $1', [id]);
  }

  private static rowToLearningPlan(row: LearningPlanRow): LearningPlan {
    return {
      id: row.id,
      studentId: row.student_id,
      examType: row.exam_type || undefined,
      examDate: row.exam_date || undefined,
      dailyTasks: row.daily_tasks || [],
      weeklyGoals: row.weekly_goals || [],
      completionRate: Number(row.completion_rate),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
