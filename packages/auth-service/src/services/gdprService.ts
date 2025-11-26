import pool from '../db/connection';
import { getRedisClient } from './redisClient';
import { SessionManager } from '../utils/sessionManager';

/**
 * GDPR Compliance Service
 * Implements requirement 9.2, 9.4 - GDPR compliance features
 */

export interface ConsentRecord {
  userId: string;
  consentType: 'terms' | 'privacy' | 'marketing' | 'analytics';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportRequest {
  userId: string;
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataDeletionRequest {
  userId: string;
  requestedAt: Date;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  reason?: string;
}

export class GDPRService {
  /**
   * Record user consent
   */
  static async recordConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        `INSERT INTO user_consents (user_id, consent_type, granted, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, consentType, granted, ipAddress, userAgent]
      );
    } finally {
      client.release();
    }
  }
  
  /**
   * Get user consent history
   */
  static async getConsentHistory(userId: string): Promise<ConsentRecord[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT user_id, consent_type, granted, created_at as timestamp, ip_address, user_agent
         FROM user_consents
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      
      return result.rows.map((row: any) => ({
        userId: row.user_id,
        consentType: row.consent_type,
        granted: row.granted,
        timestamp: row.created_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
      }));
    } finally {
      client.release();
    }
  }
  
  /**
   * Get current consent status for all types
   */
  static async getCurrentConsents(userId: string): Promise<Record<string, boolean>> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT DISTINCT ON (consent_type) consent_type, granted
         FROM user_consents
         WHERE user_id = $1
         ORDER BY consent_type, created_at DESC`,
        [userId]
      );
      
      const consents: Record<string, boolean> = {
        terms: false,
        privacy: false,
        marketing: false,
        analytics: false,
      };
      
      result.rows.forEach((row: any) => {
        consents[row.consent_type] = row.granted;
      });
      
      return consents;
    } finally {
      client.release();
    }
  }
  
  /**
   * Request data export (Right to Data Portability)
   */
  static async requestDataExport(userId: string): Promise<string> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `INSERT INTO data_export_requests (user_id, status, requested_at)
         VALUES ($1, 'pending', NOW())
         RETURNING id`,
        [userId]
      );
      
      const requestId = result.rows[0].id;
      
      // Queue the export job (in production, this would trigger a background job)
      await this.queueDataExport(requestId, userId);
      
      return requestId;
    } finally {
      client.release();
    }
  }
  
  /**
   * Queue data export for processing
   */
  private static async queueDataExport(requestId: string, userId: string): Promise<void> {
    const redis = getRedisClient();
    
    // Add to processing queue
    await redis.lpush('data_export_queue', JSON.stringify({ requestId, userId }));
  }
  
  /**
   * Process data export (generates comprehensive user data)
   */
  static async processDataExport(userId: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      // Collect all user data from various tables
      const userData: any = {
        exportedAt: new Date().toISOString(),
        userId,
        personalInformation: {},
        subscriptions: [],
        learningPlans: [],
        testResults: [],
        analytics: [],
        consents: [],
      };
      
      // Get user profile
      const userResult = await client.query(
        `SELECT id, email, first_name, last_name, age, grade, role, created_at, updated_at
         FROM users WHERE id = $1`,
        [userId]
      );
      
      if (userResult.rows.length > 0) {
        userData.personalInformation = userResult.rows[0];
      }
      
      // Get subscriptions
      const subscriptionsResult = await client.query(
        `SELECT * FROM subscriptions WHERE user_id = $1`,
        [userId]
      );
      userData.subscriptions = subscriptionsResult.rows;
      
      // Get learning plans
      const learningPlansResult = await client.query(
        `SELECT * FROM learning_plans WHERE student_id = $1`,
        [userId]
      );
      userData.learningPlans = learningPlansResult.rows;
      
      // Get test results
      const testResultsResult = await client.query(
        `SELECT * FROM test_results WHERE student_id = $1`,
        [userId]
      );
      userData.testResults = testResultsResult.rows;
      
      // Get analytics snapshots
      const analyticsResult = await client.query(
        `SELECT * FROM analytics_snapshots WHERE student_id = $1`,
        [userId]
      );
      userData.analytics = analyticsResult.rows;
      
      // Get consent history
      userData.consents = await this.getConsentHistory(userId);
      
      // Get parent-child relationships
      const relationshipsResult = await client.query(
        `SELECT * FROM parent_child_links WHERE parent_id = $1 OR child_id = $1`,
        [userId]
      );
      userData.relationships = relationshipsResult.rows;
      
      // Get usage tracking
      const usageResult = await client.query(
        `SELECT * FROM usage_tracking WHERE user_id = $1`,
        [userId]
      );
      userData.usageTracking = usageResult.rows;
      
      return userData;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get data export status
   */
  static async getDataExportStatus(requestId: string): Promise<DataExportRequest | null> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT * FROM data_export_requests WHERE id = $1`,
        [requestId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        userId: row.user_id,
        requestedAt: row.requested_at,
        status: row.status,
        downloadUrl: row.download_url,
        expiresAt: row.expires_at,
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Request data deletion (Right to be Forgotten)
   */
  static async requestDataDeletion(
    userId: string,
    reason?: string
  ): Promise<string> {
    const client = await pool.connect();
    
    try {
      // Schedule deletion for 30 days from now (grace period)
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 30);
      
      const result = await client.query(
        `INSERT INTO data_deletion_requests (user_id, status, requested_at, scheduled_for, reason)
         VALUES ($1, 'pending', NOW(), $2, $3)
         RETURNING id`,
        [userId, scheduledFor, reason]
      );
      
      const requestId = result.rows[0].id;
      
      // Notify user about the grace period
      console.log(`Data deletion scheduled for user ${userId} on ${scheduledFor.toISOString()}`);
      
      return requestId;
    } finally {
      client.release();
    }
  }
  
  /**
   * Cancel data deletion request (during grace period)
   */
  static async cancelDataDeletion(requestId: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `UPDATE data_deletion_requests
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING id`,
        [requestId]
      );
      
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
  
  /**
   * Process data deletion (permanently delete user data)
   */
  static async processDataDeletion(userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete from all tables (cascading deletes should handle most)
      // But we'll be explicit for clarity
      
      // Delete analytics data
      await client.query('DELETE FROM analytics_snapshots WHERE student_id = $1', [userId]);
      
      // Delete test results
      await client.query('DELETE FROM test_results WHERE student_id = $1', [userId]);
      
      // Delete learning plans
      await client.query('DELETE FROM learning_plans WHERE student_id = $1', [userId]);
      
      // Delete usage tracking
      await client.query('DELETE FROM usage_tracking WHERE user_id = $1', [userId]);
      
      // Delete parent-child links
      await client.query('DELETE FROM parent_child_links WHERE parent_id = $1 OR child_id = $1', [userId]);
      
      // Delete parental controls
      await client.query('DELETE FROM parental_controls WHERE parent_id = $1 OR child_id = $1', [userId]);
      
      // Delete subscriptions
      await client.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
      
      // Delete consents
      await client.query('DELETE FROM user_consents WHERE user_id = $1', [userId]);
      
      // Delete export requests
      await client.query('DELETE FROM data_export_requests WHERE user_id = $1', [userId]);
      
      // Delete deletion requests
      await client.query('DELETE FROM data_deletion_requests WHERE user_id = $1', [userId]);
      
      // Finally, delete the user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await client.query('COMMIT');
      
      // Clear Redis sessions
      await SessionManager.destroyAllUserSessions(userId);
      
      // Clear any cached data
      const redis = getRedisClient();
      const pattern = `*:${userId}:*`;
      let cursor = '0';
      
      do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;
        
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
      
      console.log(`Successfully deleted all data for user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Data deletion error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get data deletion status
   */
  static async getDataDeletionStatus(requestId: string): Promise<DataDeletionRequest | null> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT * FROM data_deletion_requests WHERE id = $1`,
        [requestId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        userId: row.user_id,
        requestedAt: row.requested_at,
        scheduledFor: row.scheduled_for,
        status: row.status,
        reason: row.reason,
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Process scheduled deletions (should be run daily)
   */
  static async processScheduledDeletions(): Promise<number> {
    const client = await pool.connect();
    
    try {
      // Find all pending deletions that are due
      const result = await client.query(
        `SELECT id, user_id FROM data_deletion_requests
         WHERE status = 'pending' AND scheduled_for <= NOW()`
      );
      
      let processed = 0;
      
      for (const row of result.rows) {
        try {
          await client.query(
            `UPDATE data_deletion_requests SET status = 'processing' WHERE id = $1`,
            [row.id]
          );
          
          await this.processDataDeletion(row.user_id);
          
          await client.query(
            `UPDATE data_deletion_requests SET status = 'completed', updated_at = NOW() WHERE id = $1`,
            [row.id]
          );
          
          processed++;
        } catch (error) {
          console.error(`Failed to process deletion for user ${row.user_id}:`, error);
          
          await client.query(
            `UPDATE data_deletion_requests SET status = 'failed', updated_at = NOW() WHERE id = $1`,
            [row.id]
          );
        }
      }
      
      return processed;
    } finally {
      client.release();
    }
  }
  
  /**
   * Anonymize user data (alternative to deletion)
   */
  static async anonymizeUserData(userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Anonymize user profile
      await client.query(
        `UPDATE users
         SET email = $1,
             first_name = 'Anonymous',
             last_name = 'User',
             age = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [`anonymous_${userId}@deleted.local`, userId]
      );
      
      // Keep analytics data but anonymize
      // (useful for aggregate statistics)
      
      await client.query('COMMIT');
      
      console.log(`Successfully anonymized data for user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Data anonymization error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

