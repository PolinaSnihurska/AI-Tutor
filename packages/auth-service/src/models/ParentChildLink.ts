import { z } from 'zod';
import { query } from '../db/connection';

// Validation schemas
export const CreateParentChildLinkSchema = z.object({
  parentId: z.string().uuid(),
  childId: z.string().uuid(),
}).refine(data => data.parentId !== data.childId, {
  message: 'Parent and child cannot be the same user',
});

export interface ParentChildLinkRow {
  id: string;
  parent_id: string;
  child_id: string;
  created_at: Date;
}

export class ParentChildLink {
  static async create(data: z.infer<typeof CreateParentChildLinkSchema>): Promise<ParentChildLinkRow> {
    const validated = CreateParentChildLinkSchema.parse(data);
    
    // Verify parent has parent role
    const parentCheck = await query(
      'SELECT role FROM users WHERE id = $1',
      [validated.parentId]
    );
    
    if (!parentCheck.rows[0] || parentCheck.rows[0].role !== 'parent') {
      throw new Error('Parent user must have parent role');
    }
    
    // Verify child has student role
    const childCheck = await query(
      'SELECT role FROM users WHERE id = $1',
      [validated.childId]
    );
    
    if (!childCheck.rows[0] || childCheck.rows[0].role !== 'student') {
      throw new Error('Child user must have student role');
    }
    
    // Check subscription limits
    const subscription = await query(
      `SELECT s.plan FROM subscriptions s WHERE s.user_id = $1`,
      [validated.parentId]
    );
    
    const plan = subscription.rows[0]?.plan || 'free';
    const existingLinks = await query(
      'SELECT COUNT(*) as count FROM parent_child_links WHERE parent_id = $1',
      [validated.parentId]
    );
    
    const linkCount = parseInt(existingLinks.rows[0].count);
    const maxChildren = plan === 'family' ? 3 : 1;
    
    if (linkCount >= maxChildren) {
      throw new Error(`Subscription plan ${plan} allows maximum ${maxChildren} child(ren)`);
    }
    
    // Create the link
    const result = await query(
      `INSERT INTO parent_child_links (parent_id, child_id)
       VALUES ($1, $2)
       ON CONFLICT (parent_id, child_id) DO NOTHING
       RETURNING *`,
      [validated.parentId, validated.childId]
    );
    
    if (!result.rows[0]) {
      throw new Error('Link already exists');
    }
    
    return result.rows[0];
  }

  static async findByParentId(parentId: string): Promise<ParentChildLinkRow[]> {
    const result = await query(
      'SELECT * FROM parent_child_links WHERE parent_id = $1 ORDER BY created_at',
      [parentId]
    );
    return result.rows;
  }

  static async findByChildId(childId: string): Promise<ParentChildLinkRow[]> {
    const result = await query(
      'SELECT * FROM parent_child_links WHERE child_id = $1 ORDER BY created_at',
      [childId]
    );
    return result.rows;
  }

  static async exists(parentId: string, childId: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM parent_child_links WHERE parent_id = $1 AND child_id = $2',
      [parentId, childId]
    );
    return result.rows.length > 0;
  }

  static async delete(parentId: string, childId: string): Promise<void> {
    await query(
      'DELETE FROM parent_child_links WHERE parent_id = $1 AND child_id = $2',
      [parentId, childId]
    );
  }

  static async deleteAllByParent(parentId: string): Promise<void> {
    await query('DELETE FROM parent_child_links WHERE parent_id = $1', [parentId]);
  }

  static async deleteAllByChild(childId: string): Promise<void> {
    await query('DELETE FROM parent_child_links WHERE child_id = $1', [childId]);
  }

  static async getChildrenProfiles(parentId: string) {
    const result = await query(
      `SELECT 
        u.id, 
        u.first_name || ' ' || u.last_name as name,
        u.age,
        u.grade,
        u.subjects,
        u.updated_at as last_active
       FROM parent_child_links pcl
       JOIN users u ON pcl.child_id = u.id
       WHERE pcl.parent_id = $1
       ORDER BY u.first_name`,
      [parentId]
    );
    return result.rows;
  }
}
