import { query } from '../db/connection';
import axios from 'axios';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface UserActivityStats {
  date: string;
  newUsers: number;
  activeUsers: number;
  totalLogins: number;
  avgSessionDuration: number;
}

export interface SubscriptionAnalytics {
  plan: string;
  count: number;
  revenue: number;
  churnRate: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
}

export interface AIUsageAnalytics {
  date: string;
  totalQueries: number;
  avgResponseTime: number;
  errorRate: number;
  topTopics: { topic: string; count: number }[];
  queriesByTier: { tier: string; count: number }[];
}

export class Monitoring {
  // Service Health Checks
  static async checkServiceHealth(serviceUrl: string, serviceName: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        name: serviceName,
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      return {
        name: serviceName,
        status: 'down',
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  static async getAllServicesHealth(): Promise<ServiceHealth[]> {
    const services = [
      { url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001', name: 'Auth Service' },
      { url: process.env.AI_SERVICE_URL || 'http://localhost:8000', name: 'AI Service' },
      { url: process.env.TEST_SERVICE_URL || 'http://localhost:3003', name: 'Test Service' },
      {
        url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004',
        name: 'Analytics Service',
      },
      {
        url: process.env.LEARNING_PLAN_SERVICE_URL || 'http://localhost:3005',
        name: 'Learning Plan Service',
      },
    ];

    const healthChecks = await Promise.all(
      services.map((service) => this.checkServiceHealth(service.url, service.name))
    );

    return healthChecks;
  }

  // User Activity Monitoring
  static async getUserActivityStats(days: number = 30): Promise<UserActivityStats[]> {
    const result = await query(
      `
      WITH daily_stats AS (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ),
      active_users AS (
        SELECT 
          DATE(date) as date,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as total_logins
        FROM usage_tracking
        WHERE date >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(date)
      )
      SELECT 
        COALESCE(ds.date, au.date) as date,
        COALESCE(ds.new_users, 0) as new_users,
        COALESCE(au.active_users, 0) as active_users,
        COALESCE(au.total_logins, 0) as total_logins,
        COALESCE(au.total_logins::float / NULLIF(au.active_users, 0), 0) as avg_session_duration
      FROM daily_stats ds
      FULL OUTER JOIN active_users au ON ds.date = au.date
      ORDER BY date DESC
    `
    );

    return result.rows;
  }

  static async getRecentUserActivity(limit: number = 100) {
    const result = await query(
      `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        ut.date,
        ut.ai_queries,
        ut.tests_taken,
        ut.study_minutes
      FROM usage_tracking ut
      JOIN users u ON ut.user_id = u.id
      ORDER BY ut.date DESC
      LIMIT $1
    `,
      [limit]
    );

    return result.rows;
  }

  // Subscription Analytics
  static async getSubscriptionAnalytics(): Promise<SubscriptionAnalytics[]> {
    const result = await query(`
      WITH subscription_stats AS (
        SELECT 
          plan,
          COUNT(*) as count,
          SUM(CASE 
            WHEN plan = 'premium' THEN 9.99
            WHEN plan = 'family' THEN 19.99
            ELSE 0
          END) as revenue,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_subscriptions,
          COUNT(CASE WHEN status = 'cancelled' AND updated_at >= NOW() - INTERVAL '30 days' THEN 1 END) as cancelled_subscriptions
        FROM subscriptions
        WHERE status IN ('active', 'cancelled')
        GROUP BY plan
      )
      SELECT 
        plan,
        count,
        revenue,
        CASE 
          WHEN count > 0 THEN (cancelled_subscriptions::float / count * 100)
          ELSE 0
        END as churn_rate,
        new_subscriptions,
        cancelled_subscriptions
      FROM subscription_stats
    `);

    return result.rows;
  }

  static async getSubscriptionTrends(days: number = 30) {
    const result = await query(
      `
      SELECT 
        DATE(created_at) as date,
        plan,
        COUNT(*) as new_subscriptions
      FROM subscriptions
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at), plan
      ORDER BY date DESC, plan
    `
    );

    return result.rows;
  }

  // AI Usage Analytics
  static async getAIUsageAnalytics(days: number = 30): Promise<AIUsageAnalytics[]> {
    const result = await query(
      `
      WITH daily_usage AS (
        SELECT 
          date,
          SUM(ai_queries) as total_queries
        FROM usage_tracking
        WHERE date >= NOW() - INTERVAL '${days} days'
        GROUP BY date
      ),
      tier_usage AS (
        SELECT 
          ut.date,
          s.plan as tier,
          SUM(ut.ai_queries) as count
        FROM usage_tracking ut
        JOIN subscriptions s ON ut.user_id = s.user_id
        WHERE ut.date >= NOW() - INTERVAL '${days} days'
        GROUP BY ut.date, s.plan
      )
      SELECT 
        du.date::text,
        du.total_queries,
        0 as avg_response_time,
        0 as error_rate,
        '[]'::jsonb as top_topics,
        jsonb_agg(jsonb_build_object('tier', tu.tier, 'count', tu.count)) as queries_by_tier
      FROM daily_usage du
      LEFT JOIN tier_usage tu ON du.date = tu.date
      GROUP BY du.date, du.total_queries
      ORDER BY du.date DESC
    `
    );

    return result.rows.map((row) => ({
      date: row.date,
      totalQueries: parseInt(row.total_queries),
      avgResponseTime: row.avg_response_time,
      errorRate: row.error_rate,
      topTopics: row.top_topics || [],
      queriesByTier: row.queries_by_tier || [],
    }));
  }

  static async getAIUsageSummary() {
    const result = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as unique_users,
        SUM(ai_queries) as total_queries,
        AVG(ai_queries) as avg_queries_per_user,
        MAX(ai_queries) as max_queries_per_user
      FROM usage_tracking
      WHERE date >= NOW() - INTERVAL '30 days'
    `);

    return result.rows[0];
  }

  // System Performance Metrics
  static async getDatabaseStats() {
    const result = await query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `);

    return result.rows;
  }

  static async getErrorLogs(limit: number = 100) {
    // This would typically query a logging system like ELK or CloudWatch
    // For now, return a placeholder
    return {
      message: 'Error logs would be fetched from logging system (ELK, CloudWatch, etc.)',
      count: 0,
      logs: [],
    };
  }
}
