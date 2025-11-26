import { z } from 'zod';
import { query } from '../db/connection';

// Validation schemas
export const ParentalControlSchema = z.object({
  parentId: z.string().uuid(),
  childId: z.string().uuid(),
  dailyTimeLimitMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  contentRestrictions: z.array(z.string()).optional(),
  allowedSubjects: z.array(z.string()).nullable().optional(),
  blockedFeatures: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export interface ParentalControlRow {
  id: string;
  parent_id: string;
  child_id: string;
  daily_time_limit_minutes: number | null;
  content_restrictions: string[];
  allowed_subjects: string[] | null;
  blocked_features: string[];
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ParentalControl {
  id: string;
  parentId: string;
  childId: string;
  dailyTimeLimitMinutes: number | null;
  contentRestrictions: string[];
  allowedSubjects: string[] | null;
  blockedFeatures: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ParentalControlModel {
  static async create(data: z.infer<typeof ParentalControlSchema>): Promise<ParentalControl> {
    const validated = ParentalControlSchema.parse(data);
    
    const result = await query(
      `INSERT INTO parental_controls 
       (parent_id, child_id, daily_time_limit_minutes, content_restrictions, allowed_subjects, blocked_features, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (parent_id, child_id) 
       DO UPDATE SET 
         daily_time_limit_minutes = EXCLUDED.daily_time_limit_minutes,
         content_restrictions = EXCLUDED.content_restrictions,
         allowed_subjects = EXCLUDED.allowed_subjects,
         blocked_features = EXCLUDED.blocked_features,
         active = EXCLUDED.active,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        validated.parentId,
        validated.childId,
        validated.dailyTimeLimitMinutes ?? null,
        JSON.stringify(validated.contentRestrictions || []),
        validated.allowedSubjects ? JSON.stringify(validated.allowedSubjects) : null,
        JSON.stringify(validated.blockedFeatures || []),
        validated.active ?? true
      ]
    );
    
    return this.mapRow(result.rows[0]);
  }

  static async findByParentAndChild(parentId: string, childId: string): Promise<ParentalControl | null> {
    const result = await query(
      'SELECT * FROM parental_controls WHERE parent_id = $1 AND child_id = $2',
      [parentId, childId]
    );
    
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByChild(childId: string): Promise<ParentalControl[]> {
    const result = await query(
      'SELECT * FROM parental_controls WHERE child_id = $1 AND active = true',
      [childId]
    );
    
    return result.rows.map(this.mapRow);
  }

  static async update(
    parentId: string,
    childId: string,
    data: Partial<z.infer<typeof ParentalControlSchema>>
  ): Promise<ParentalControl | null> {
    const existing = await this.findByParentAndChild(parentId, childId);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.dailyTimeLimitMinutes !== undefined) {
      updates.push(`daily_time_limit_minutes = $${paramCount++}`);
      values.push(data.dailyTimeLimitMinutes);
    }

    if (data.contentRestrictions !== undefined) {
      updates.push(`content_restrictions = $${paramCount++}`);
      values.push(JSON.stringify(data.contentRestrictions));
    }

    if (data.allowedSubjects !== undefined) {
      updates.push(`allowed_subjects = $${paramCount++}`);
      values.push(data.allowedSubjects ? JSON.stringify(data.allowedSubjects) : null);
    }

    if (data.blockedFeatures !== undefined) {
      updates.push(`blocked_features = $${paramCount++}`);
      values.push(JSON.stringify(data.blockedFeatures));
    }

    if (data.active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(data.active);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parentId, childId);

    const result = await query(
      `UPDATE parental_controls 
       SET ${updates.join(', ')}
       WHERE parent_id = $${paramCount++} AND child_id = $${paramCount++}
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async delete(parentId: string, childId: string): Promise<void> {
    await query(
      'DELETE FROM parental_controls WHERE parent_id = $1 AND child_id = $2',
      [parentId, childId]
    );
  }

  /**
   * Check if a child has exceeded their daily time limit
   */
  static async checkTimeLimit(childId: string): Promise<{
    hasLimit: boolean;
    limitMinutes: number | null;
    usedMinutes: number;
    exceeded: boolean;
  }> {
    const controls = await this.findByChild(childId);
    
    if (controls.length === 0 || controls[0].dailyTimeLimitMinutes === null) {
      return {
        hasLimit: false,
        limitMinutes: null,
        usedMinutes: 0,
        exceeded: false
      };
    }

    const limitMinutes = controls[0].dailyTimeLimitMinutes;

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await query(
      `SELECT COALESCE(SUM(duration_minutes), 0) as used_minutes
       FROM child_activity_log
       WHERE child_id = $1
       AND timestamp >= $2
       AND timestamp < $3`,
      [childId, today, tomorrow]
    );

    const usedMinutes = parseInt(result.rows[0].used_minutes);

    return {
      hasLimit: true,
      limitMinutes,
      usedMinutes,
      exceeded: usedMinutes >= limitMinutes
    };
  }

  private static mapRow(row: ParentalControlRow): ParentalControl {
    return {
      id: row.id,
      parentId: row.parent_id,
      childId: row.child_id,
      dailyTimeLimitMinutes: row.daily_time_limit_minutes,
      contentRestrictions: row.content_restrictions,
      allowedSubjects: row.allowed_subjects,
      blockedFeatures: row.blocked_features,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Activity logging
export interface ChildActivityLog {
  id: string;
  childId: string;
  activityType: string;
  activityDetails: Record<string, any>;
  durationMinutes: number | null;
  timestamp: Date;
  flagged: boolean;
  flagReason: string | null;
}

export class ChildActivityLogModel {
  static async create(data: {
    childId: string;
    activityType: string;
    activityDetails: Record<string, any>;
    durationMinutes?: number;
    flagged?: boolean;
    flagReason?: string;
  }): Promise<ChildActivityLog> {
    const result = await query(
      `INSERT INTO child_activity_log 
       (child_id, activity_type, activity_details, duration_minutes, flagged, flag_reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.childId,
        data.activityType,
        JSON.stringify(data.activityDetails),
        data.durationMinutes ?? null,
        data.flagged ?? false,
        data.flagReason ?? null
      ]
    );
    
    return this.mapRow(result.rows[0]);
  }

  static async findByChild(
    childId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<ChildActivityLog[]> {
    const result = await query(
      `SELECT * FROM child_activity_log 
       WHERE child_id = $1 
       AND timestamp BETWEEN $2 AND $3
       ORDER BY timestamp DESC
       LIMIT $4`,
      [childId, startDate, endDate, limit]
    );
    
    return result.rows.map(this.mapRow);
  }

  static async findFlaggedActivities(
    childId: string,
    limit: number = 50
  ): Promise<ChildActivityLog[]> {
    const result = await query(
      `SELECT * FROM child_activity_log 
       WHERE child_id = $1 AND flagged = true
       ORDER BY timestamp DESC
       LIMIT $2`,
      [childId, limit]
    );
    
    return result.rows.map(this.mapRow);
  }

  static async getTodayActivitySummary(childId: string): Promise<{
    totalActivities: number;
    totalMinutes: number;
    activityBreakdown: Record<string, number>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await query(
      `SELECT 
         COUNT(*) as total_activities,
         COALESCE(SUM(duration_minutes), 0) as total_minutes,
         activity_type,
         COUNT(*) as type_count
       FROM child_activity_log
       WHERE child_id = $1
       AND timestamp >= $2
       AND timestamp < $3
       GROUP BY activity_type`,
      [childId, today, tomorrow]
    );

    const activityBreakdown: Record<string, number> = {};
    let totalActivities = 0;
    let totalMinutes = 0;

    for (const row of result.rows) {
      activityBreakdown[row.activity_type] = parseInt(row.type_count);
      totalActivities += parseInt(row.type_count);
      totalMinutes += parseInt(row.total_minutes);
    }

    return {
      totalActivities,
      totalMinutes,
      activityBreakdown
    };
  }

  private static mapRow(row: any): ChildActivityLog {
    return {
      id: row.id,
      childId: row.child_id,
      activityType: row.activity_type,
      activityDetails: row.activity_details,
      durationMinutes: row.duration_minutes,
      timestamp: row.timestamp,
      flagged: row.flagged,
      flagReason: row.flag_reason
    };
  }
}
