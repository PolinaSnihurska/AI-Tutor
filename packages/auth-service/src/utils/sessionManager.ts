import { getRedisClient } from '../services/redisClient';
import { generateSecureToken, encrypt, decrypt } from './encryption';

/**
 * Secure session management
 * Implements requirement 9.1, 9.2 - Secure session management
 */

interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
}

const SESSION_PREFIX = 'session:';
const SESSION_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const ACTIVITY_TIMEOUT = 30 * 60; // 30 minutes in seconds

export class SessionManager {
  /**
   * Create a new session
   */
  static async createSession(
    userId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const sessionId = generateSecureToken(32);
    const redis = getRedisClient();
    
    const sessionData: SessionData = {
      userId,
      email,
      role,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress,
      userAgent,
    };
    
    // Encrypt session data before storing
    const encryptedData = encrypt(JSON.stringify(sessionData));
    
    await redis.setex(
      `${SESSION_PREFIX}${sessionId}`,
      SESSION_EXPIRY,
      encryptedData
    );
    
    // Track active sessions for user
    await redis.sadd(`user_sessions:${userId}`, sessionId);
    await redis.expire(`user_sessions:${userId}`, SESSION_EXPIRY);
    
    return sessionId;
  }
  
  /**
   * Get session data
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const redis = getRedisClient();
      const encryptedData = await redis.get(`${SESSION_PREFIX}${sessionId}`);
      
      if (!encryptedData) {
        return null;
      }
      
      // Decrypt session data
      const decrypted = decrypt(encryptedData);
      const sessionData: SessionData = JSON.parse(decrypted);
      
      // Check if session is still active (last activity within timeout)
      const timeSinceActivity = Date.now() - sessionData.lastActivity;
      if (timeSinceActivity > ACTIVITY_TIMEOUT * 1000) {
        await this.destroySession(sessionId);
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }
  
  /**
   * Update session activity
   */
  static async updateActivity(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.getSession(sessionId);
      
      if (!sessionData) {
        return;
      }
      
      sessionData.lastActivity = Date.now();
      
      const redis = getRedisClient();
      const encryptedData = encrypt(JSON.stringify(sessionData));
      
      await redis.setex(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_EXPIRY,
        encryptedData
      );
    } catch (error) {
      console.error('Update activity error:', error);
    }
  }
  
  /**
   * Destroy a session
   */
  static async destroySession(sessionId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const sessionData = await this.getSession(sessionId);
      
      if (sessionData) {
        // Remove from user's active sessions
        await redis.srem(`user_sessions:${sessionData.userId}`, sessionId);
      }
      
      await redis.del(`${SESSION_PREFIX}${sessionId}`);
    } catch (error) {
      console.error('Destroy session error:', error);
    }
  }
  
  /**
   * Destroy all sessions for a user
   */
  static async destroyAllUserSessions(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const sessionIds = await redis.smembers(`user_sessions:${userId}`);
      
      if (sessionIds.length > 0) {
        const keys = sessionIds.map(id => `${SESSION_PREFIX}${id}`);
        await redis.del(...keys);
      }
      
      await redis.del(`user_sessions:${userId}`);
    } catch (error) {
      console.error('Destroy all sessions error:', error);
    }
  }
  
  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const redis = getRedisClient();
      const sessionIds = await redis.smembers(`user_sessions:${userId}`);
      
      const sessions: SessionData[] = [];
      
      for (const sessionId of sessionIds) {
        const sessionData = await this.getSession(sessionId);
        if (sessionData) {
          sessions.push(sessionData);
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }
  
  /**
   * Validate session and check for suspicious activity
   */
  static async validateSession(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const sessionData = await this.getSession(sessionId);
    
    if (!sessionData) {
      return { valid: false, reason: 'Session not found or expired' };
    }
    
    // Check for IP address change (potential session hijacking)
    if (sessionData.ipAddress && ipAddress && sessionData.ipAddress !== ipAddress) {
      console.warn(`Session IP mismatch for user ${sessionData.userId}: ${sessionData.ipAddress} -> ${ipAddress}`);
      // In production, you might want to invalidate the session here
      // For now, we'll just log it
    }
    
    // Check for user agent change
    if (sessionData.userAgent && userAgent && sessionData.userAgent !== userAgent) {
      console.warn(`Session user agent mismatch for user ${sessionData.userId}`);
    }
    
    // Update activity
    await this.updateActivity(sessionId);
    
    return { valid: true };
  }
  
  /**
   * Clean up expired sessions (should be run periodically)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const redis = getRedisClient();
      const pattern = `${SESSION_PREFIX}*`;
      let cursor = '0';
      let cleaned = 0;
      
      do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;
        
        for (const key of keys) {
          const ttl = await redis.ttl(key);
          if (ttl === -1 || ttl === -2) {
            await redis.del(key);
            cleaned++;
          }
        }
      } while (cursor !== '0');
      
      return cleaned;
    } catch (error) {
      console.error('Cleanup sessions error:', error);
      return 0;
    }
  }
}
