import { query } from '../db/connection';
import bcrypt from 'bcrypt';

export interface AdminRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  last_login: Date | null;
  login_attempts: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  revenue: number;
  aiQueriesTotal: number;
  testsGeneratedTotal: number;
}

export class Admin {
  static async findByEmail(email: string): Promise<AdminRow | null> {
    const result = await query('SELECT * FROM users WHERE email = $1 AND role = $2', [
      email,
      'admin',
    ]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<AdminRow | null> {
    const result = await query('SELECT * FROM users WHERE id = $1 AND role = $2', [id, 'admin']);
    return result.rows[0] || null;
  }

  static async verifyPassword(admin: AdminRow, password: string): Promise<boolean> {
    return await bcrypt.compare(password, admin.password_hash);
  }

  static async incrementLoginAttempts(id: string): Promise<void> {
    await query(
      `UPDATE users 
       SET login_attempts = login_attempts + 1,
           locked_until = CASE 
             WHEN login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
             ELSE locked_until
           END
       WHERE id = $1`,
      [id]
    );
  }

  static async resetLoginAttempts(id: string): Promise<void> {
    await query(
      `UPDATE users 
       SET login_attempts = 0, 
           locked_until = NULL,
           last_login = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  static async isLocked(admin: AdminRow): Promise<boolean> {
    if (!admin.locked_until) return false;
    return new Date(admin.locked_until) > new Date();
  }

  static async getDashboardMetrics(): Promise<AdminMetrics> {
    // Get total and active users
    const usersResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users
      FROM users
      WHERE role IN ('student', 'parent')
    `);

    // Get subscription stats
    const subscriptionsResult = await query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        SUM(CASE 
          WHEN plan = 'premium' THEN 9.99
          WHEN plan = 'family' THEN 19.99
          ELSE 0
        END) as revenue
      FROM subscriptions
      WHERE status = 'active'
    `);

    // Get usage stats
    const usageResult = await query(`
      SELECT 
        SUM(ai_queries) as ai_queries_total,
        SUM(tests_taken) as tests_generated_total
      FROM usage_tracking
      WHERE date >= NOW() - INTERVAL '30 days'
    `);

    return {
      totalUsers: parseInt(usersResult.rows[0]?.total_users || '0'),
      activeUsers: parseInt(usersResult.rows[0]?.active_users || '0'),
      totalSubscriptions: parseInt(subscriptionsResult.rows[0]?.total_subscriptions || '0'),
      revenue: parseFloat(subscriptionsResult.rows[0]?.revenue || '0'),
      aiQueriesTotal: parseInt(usageResult.rows[0]?.ai_queries_total || '0'),
      testsGeneratedTotal: parseInt(usageResult.rows[0]?.tests_generated_total || '0'),
    };
  }

  static async getAllUsers(
    page: number = 1,
    limit: number = 50,
    role?: string
  ): Promise<{ users: any[]; total: number }> {
    const offset = (page - 1) * limit;
    let whereClause = "role IN ('student', 'parent', 'admin')";
    const params: any[] = [limit, offset];

    if (role) {
      whereClause = 'role = $3';
      params.push(role);
    }

    const result = await query(
      `SELECT 
        id, email, role, first_name, last_name, age, grade, 
        email_verified, created_at, updated_at
       FROM users
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      role ? [role] : []
    );

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].total),
    };
  }

  static async getUserDetails(userId: string): Promise<any> {
    const userResult = await query(
      `SELECT 
        u.id, u.email, u.role, u.first_name, u.last_name, u.age, u.grade,
        u.subjects, u.preferences, u.email_verified, u.created_at, u.updated_at,
        s.plan, s.status as subscription_status, s.start_date, s.end_date
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];

    // Get usage stats
    const usageResult = await query(
      `SELECT 
        SUM(ai_queries) as total_ai_queries,
        SUM(tests_taken) as total_tests,
        SUM(study_minutes) as total_study_minutes
       FROM usage_tracking
       WHERE user_id = $1`,
      [userId]
    );

    // Get test results
    const testsResult = await query(
      `SELECT COUNT(*) as tests_completed, AVG(percentage) as avg_score
       FROM test_results
       WHERE student_id = $1`,
      [userId]
    );

    return {
      ...user,
      usage: usageResult.rows[0],
      performance: testsResult.rows[0],
    };
  }

  static async updateUserStatus(userId: string, emailVerified: boolean): Promise<void> {
    await query('UPDATE users SET email_verified = $1 WHERE id = $2', [emailVerified, userId]);
  }

  static async deleteUser(userId: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [userId]);
  }
}
