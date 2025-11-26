import { StudentActivityModel, ActivityType } from '../models/StudentActivity';
import { TopicPerformanceModel } from '../models/TopicPerformance';
import Redis from 'redis';

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

export interface TrackEventData {
  studentId: string;
  activityType: ActivityType;
  subject?: string;
  topic?: string;
  metadata?: Record<string, any>;
  durationMinutes?: number;
  score?: number;
}

export class EventTrackingService {
  /**
   * Track a student activity event
   */
  static async trackEvent(data: TrackEventData): Promise<void> {
    try {
      // Store activity in database
      await StudentActivityModel.create({
        studentId: data.studentId,
        activityType: data.activityType,
        subject: data.subject,
        topic: data.topic,
        metadata: data.metadata || {},
        durationMinutes: data.durationMinutes,
        score: data.score
      });

      // Update topic performance if test completed
      if (data.activityType === 'test_completed' && data.subject && data.topic && data.metadata?.correct !== undefined) {
        await TopicPerformanceModel.upsert({
          studentId: data.studentId,
          subject: data.subject,
          topic: data.topic,
          isCorrect: data.metadata.correct
        });
      }

      // Publish real-time update via Redis pub/sub
      await this.publishRealtimeUpdate(data.studentId, {
        type: data.activityType,
        timestamp: new Date(),
        data: {
          subject: data.subject,
          topic: data.topic,
          score: data.score
        }
      });

      // Update real-time metrics cache
      await this.updateRealtimeMetrics(data.studentId);
    } catch (error) {
      console.error('Error tracking event:', error);
      throw error;
    }
  }

  /**
   * Publish real-time update to WebSocket clients via Redis pub/sub
   */
  private static async publishRealtimeUpdate(studentId: string, update: any): Promise<void> {
    try {
      await redisClient.publish(
        `analytics:student:${studentId}`,
        JSON.stringify(update)
      );
    } catch (error) {
      console.error('Error publishing real-time update:', error);
    }
  }

  /**
   * Update real-time metrics in Redis cache
   */
  private static async updateRealtimeMetrics(studentId: string): Promise<void> {
    try {
      const cacheKey = `analytics:realtime:${studentId}`;
      
      // Get current date activities
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const activities = await StudentActivityModel.findByStudentAndDateRange(
        studentId,
        today,
        tomorrow
      );

      // Calculate today's metrics
      const metrics = {
        testsCompleted: activities.filter(a => a.activityType === 'test_completed').length,
        studyTime: activities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0),
        averageScore: this.calculateAverageScore(activities),
        lastActivity: activities[0]?.createdAt || null,
        updatedAt: new Date()
      };

      // Cache for 10 seconds (as per requirement 4.4)
      await redisClient.setEx(cacheKey, 10, JSON.stringify(metrics));
    } catch (error) {
      console.error('Error updating real-time metrics:', error);
    }
  }

  /**
   * Get real-time metrics from cache
   */
  static async getRealtimeMetrics(studentId: string): Promise<any> {
    try {
      const cacheKey = `analytics:realtime:${studentId}`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // If not cached, calculate and cache
      await this.updateRealtimeMetrics(studentId);
      const newCached = await redisClient.get(cacheKey);
      return newCached ? JSON.parse(newCached) : null;
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time updates for a student
   */
  static async subscribeToUpdates(studentId: string, callback: (update: any) => void): Promise<void> {
    const subscriber = redisClient.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(`analytics:student:${studentId}`, (message) => {
      try {
        const update = JSON.parse(message);
        callback(update);
      } catch (error) {
        console.error('Error processing real-time update:', error);
      }
    });
  }

  private static calculateAverageScore(activities: any[]): number {
    const scoredActivities = activities.filter(a => a.score !== null && a.score !== undefined);
    if (scoredActivities.length === 0) return 0;
    
    const sum = scoredActivities.reduce((total, a) => total + a.score, 0);
    return sum / scoredActivities.length;
  }
}
