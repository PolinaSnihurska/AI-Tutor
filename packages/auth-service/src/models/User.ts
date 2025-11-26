import { z } from 'zod';
import { query } from '../db/connection';
import { UserRole, UserProfile, UserPreferences } from '@ai-tutor/shared-types';

// Validation schemas
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().optional(),
  notifications: z.object({
    email: z.boolean(),
    inApp: z.boolean(),
    taskReminders: z.boolean(),
    weeklyReports: z.boolean(),
  }).optional(),
  concentrationMode: z.boolean().optional(),
});

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  passwordHash: z.string().min(1, 'Password hash is required'),
  role: z.enum(['student', 'parent', 'admin']),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  age: z.number().int().min(5).max(120).optional(),
  grade: z.number().int().min(1).max(12).optional(),
  subjects: z.array(z.string()).optional(),
  preferences: UserPreferencesSchema.optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ passwordHash: true });

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  age: number | null;
  grade: number | null;
  subjects: string[];
  preferences: UserPreferences;
  email_verified: boolean;
  email_verification_token: string | null;
  email_verification_expires: Date | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class User {
  static async create(data: z.infer<typeof CreateUserSchema>): Promise<UserRow> {
    const validated = CreateUserSchema.parse(data);
    
    const result = await query(
      `INSERT INTO users (
        email, password_hash, role, first_name, last_name, age, grade, subjects, preferences
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        validated.email,
        validated.passwordHash,
        validated.role,
        validated.firstName,
        validated.lastName,
        validated.age || null,
        validated.grade || null,
        JSON.stringify(validated.subjects || []),
        JSON.stringify(validated.preferences || {}),
      ]
    );
    
    return result.rows[0];
  }

  static async findById(id: string): Promise<UserRow | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<UserRow | null> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async findByEmailVerificationToken(token: string): Promise<UserRow | null> {
    const result = await query(
      'SELECT * FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
      [token]
    );
    return result.rows[0] || null;
  }

  static async findByPasswordResetToken(token: string): Promise<UserRow | null> {
    const result = await query(
      'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    return result.rows[0] || null;
  }

  static async update(id: string, data: z.infer<typeof UpdateUserSchema>): Promise<UserRow | null> {
    const validated = UpdateUserSchema.parse(data);
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (validated.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(validated.email);
    }
    if (validated.firstName !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(validated.firstName);
    }
    if (validated.lastName !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(validated.lastName);
    }
    if (validated.age !== undefined) {
      fields.push(`age = $${paramCount++}`);
      values.push(validated.age);
    }
    if (validated.grade !== undefined) {
      fields.push(`grade = $${paramCount++}`);
      values.push(validated.grade);
    }
    if (validated.subjects !== undefined) {
      fields.push(`subjects = $${paramCount++}`);
      values.push(JSON.stringify(validated.subjects));
    }
    if (validated.preferences !== undefined) {
      fields.push(`preferences = $${paramCount++}`);
      values.push(JSON.stringify(validated.preferences));
    }

    if (fields.length === 0) {
      return await User.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  }

  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
  }

  static async setEmailVerificationToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await query(
      'UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3',
      [token, expiresAt, id]
    );
  }

  static async verifyEmail(id: string): Promise<void> {
    await query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1',
      [id]
    );
  }

  static async setPasswordResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [token, expiresAt, id]
    );
  }

  static async clearPasswordResetToken(id: string): Promise<void> {
    await query(
      'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1',
      [id]
    );
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [id]);
  }

  static toProfile(user: UserRow): UserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      age: user.age || undefined,
      grade: user.grade || undefined,
      subjects: user.subjects || [],
      preferences: user.preferences,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
