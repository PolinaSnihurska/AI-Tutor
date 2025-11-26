import { z } from 'zod';
import { query } from '../db/connection';
import { SubscriptionPlan, SubscriptionStatus, Subscription as ISubscription } from '@ai-tutor/shared-types';

// Validation schemas
export const CreateSubscriptionSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(['free', 'premium', 'family']),
  status: z.enum(['active', 'cancelled', 'expired', 'trial']),
  startDate: z.date().optional(),
  endDate: z.date().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  stripeCustomerId: z.string().optional(),
});

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial().omit({ userId: true });

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  start_date: Date;
  end_date: Date | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class Subscription {
  static async create(data: z.infer<typeof CreateSubscriptionSchema>): Promise<SubscriptionRow> {
    const validated = CreateSubscriptionSchema.parse(data);
    
    const result = await query(
      `INSERT INTO subscriptions (
        user_id, plan, status, start_date, end_date, stripe_subscription_id, stripe_customer_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        validated.userId,
        validated.plan,
        validated.status,
        validated.startDate || new Date(),
        validated.endDate || null,
        validated.stripeSubscriptionId || null,
        validated.stripeCustomerId || null,
      ]
    );
    
    return result.rows[0];
  }

  static async findByUserId(userId: string): Promise<SubscriptionRow | null> {
    const result = await query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<SubscriptionRow | null> {
    const result = await query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<SubscriptionRow | null> {
    const result = await query(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    );
    return result.rows[0] || null;
  }

  static async update(userId: string, data: z.infer<typeof UpdateSubscriptionSchema>): Promise<SubscriptionRow | null> {
    const validated = UpdateSubscriptionSchema.parse(data);
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (validated.plan !== undefined) {
      fields.push(`plan = $${paramCount++}`);
      values.push(validated.plan);
    }
    if (validated.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(validated.status);
    }
    if (validated.startDate !== undefined) {
      fields.push(`start_date = $${paramCount++}`);
      values.push(validated.startDate);
    }
    if (validated.endDate !== undefined) {
      fields.push(`end_date = $${paramCount++}`);
      values.push(validated.endDate);
    }
    if (validated.stripeSubscriptionId !== undefined) {
      fields.push(`stripe_subscription_id = $${paramCount++}`);
      values.push(validated.stripeSubscriptionId);
    }
    if (validated.stripeCustomerId !== undefined) {
      fields.push(`stripe_customer_id = $${paramCount++}`);
      values.push(validated.stripeCustomerId);
    }

    if (fields.length === 0) {
      return await Subscription.findByUserId(userId);
    }

    values.push(userId);
    const result = await query(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  }

  static async delete(userId: string): Promise<void> {
    await query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
  }

  static async expireSubscriptions(): Promise<number> {
    const result = await query(
      `UPDATE subscriptions 
       SET status = 'expired' 
       WHERE status = 'active' 
       AND end_date IS NOT NULL 
       AND end_date < NOW()
       RETURNING id`
    );
    return result.rowCount || 0;
  }
}
