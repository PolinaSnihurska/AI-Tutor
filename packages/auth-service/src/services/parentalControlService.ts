import { ParentalControlModel, ChildActivityLogModel, ParentalControl } from '../models/ParentalControl';
import { ParentChildLink } from '../models/ParentChildLink';

export class ParentalControlService {
  /**
   * Set or update parental controls for a child
   */
  static async setControls(
    parentId: string,
    childId: string,
    controls: {
      dailyTimeLimitMinutes?: number | null;
      contentRestrictions?: string[];
      allowedSubjects?: string[] | null;
      blockedFeatures?: string[];
      active?: boolean;
    }
  ): Promise<ParentalControl> {
    // Verify parent-child relationship
    const isLinked = await ParentChildLink.exists(parentId, childId);
    if (!isLinked) {
      throw new Error('Parent-child relationship not found');
    }

    return await ParentalControlModel.create({
      parentId,
      childId,
      ...controls
    });
  }

  /**
   * Get parental controls for a child
   */
  static async getControls(parentId: string, childId: string): Promise<ParentalControl | null> {
    // Verify parent-child relationship
    const isLinked = await ParentChildLink.exists(parentId, childId);
    if (!isLinked) {
      throw new Error('Parent-child relationship not found');
    }

    return await ParentalControlModel.findByParentAndChild(parentId, childId);
  }

  /**
   * Update parental controls
   */
  static async updateControls(
    parentId: string,
    childId: string,
    updates: Partial<{
      dailyTimeLimitMinutes: number | null;
      contentRestrictions: string[];
      allowedSubjects: string[] | null;
      blockedFeatures: string[];
      active: boolean;
    }>
  ): Promise<ParentalControl | null> {
    // Verify parent-child relationship
    const isLinked = await ParentChildLink.exists(parentId, childId);
    if (!isLinked) {
      throw new Error('Parent-child relationship not found');
    }

    return await ParentalControlModel.update(parentId, childId, updates);
  }

  /**
   * Check if a child can perform an activity based on parental controls
   */
  static async canPerformActivity(
    childId: string,
    activityType: string,
    subject?: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const controls = await ParentalControlModel.findByChild(childId);
    
    if (controls.length === 0 || !controls[0].active) {
      return { allowed: true };
    }

    const control = controls[0];

    // Check time limit
    const timeCheck = await ParentalControlModel.checkTimeLimit(childId);
    if (timeCheck.exceeded) {
      return {
        allowed: false,
        reason: `Daily time limit of ${timeCheck.limitMinutes} minutes exceeded`
      };
    }

    // Check subject restrictions
    if (subject && control.allowedSubjects && control.allowedSubjects.length > 0) {
      if (!control.allowedSubjects.includes(subject)) {
        return {
          allowed: false,
          reason: `Subject "${subject}" is not in allowed subjects list`
        };
      }
    }

    // Check blocked features
    if (control.blockedFeatures.includes(activityType)) {
      return {
        allowed: false,
        reason: `Activity type "${activityType}" is blocked by parental controls`
      };
    }

    return { allowed: true };
  }

  /**
   * Log a child's activity
   */
  static async logActivity(
    childId: string,
    activityType: string,
    activityDetails: Record<string, any>,
    durationMinutes?: number
  ): Promise<void> {
    // Check if activity should be flagged
    const { flagged, reason } = await this.shouldFlagActivity(childId, activityType, activityDetails);

    await ChildActivityLogModel.create({
      childId,
      activityType,
      activityDetails,
      durationMinutes,
      flagged,
      flagReason: reason
    });
  }

  /**
   * Determine if an activity should be flagged for parent review
   */
  private static async shouldFlagActivity(
    childId: string,
    activityType: string,
    activityDetails: Record<string, any>
  ): Promise<{ flagged: boolean; reason?: string }> {
    // Flag if test score is very low
    if (activityType === 'test_completed' && activityDetails.score !== undefined) {
      if (activityDetails.score < 40) {
        return {
          flagged: true,
          reason: 'Low test score (below 40%)'
        };
      }
    }

    // Flag if excessive time spent in one session
    if (activityDetails.durationMinutes && activityDetails.durationMinutes > 180) {
      return {
        flagged: true,
        reason: 'Excessive study time in single session (over 3 hours)'
      };
    }

    // Flag if late night activity (between 10 PM and 6 AM)
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      return {
        flagged: true,
        reason: 'Late night activity'
      };
    }

    return { flagged: false };
  }

  /**
   * Get activity log for a child
   */
  static async getActivityLog(
    parentId: string,
    childId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ) {
    // Verify parent-child relationship
    const isLinked = await ParentChildLink.exists(parentId, childId);
    if (!isLinked) {
      throw new Error('Parent-child relationship not found');
    }

    return await ChildActivityLogModel.findByChild(childId, startDate, endDate, limit);
  }

  /**
   * Get flagged activities for parent review
   */
  static async getFlaggedActivities(parentId: string, childId: string, limit: number = 50) {
    // Verify parent-child relationship
    const isLinked = await ParentChildLink.exists(parentId, childId);
    if (!isLinked) {
      throw new Error('Parent-child relationship not found');
    }

    return await ChildActivityLogModel.findFlaggedActivities(childId, limit);
  }

  /**
   * Get today's activity summary
   */
  static async getTodayActivitySummary(parentId: string, childId: string) {
    // Verify parent-child relationship
    const isLinked = await ParentChildLink.exists(parentId, childId);
    if (!isLinked) {
      throw new Error('Parent-child relationship not found');
    }

    const summary = await ChildActivityLogModel.getTodayActivitySummary(childId);
    const timeCheck = await ParentalControlModel.checkTimeLimit(childId);

    return {
      ...summary,
      timeLimit: timeCheck
    };
  }

  /**
   * Get learning time monitoring data
   */
  static async getLearningTimeMonitoring(
    parentId: string,
    childId: string,
    days: number = 7
  ) {
    // Verify parent-child relationship
    const isLinked = await ParentChildLink.exists(parentId, childId);
    if (!isLinked) {
      throw new Error('Parent-child relationship not found');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await ChildActivityLogModel.findByChild(childId, startDate, endDate, 1000);

    // Group by date
    const dailyData: Record<string, { minutes: number; activities: number }> = {};

    for (const activity of activities) {
      const date = activity.timestamp.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { minutes: 0, activities: 0 };
      }
      dailyData[date].minutes += activity.durationMinutes || 0;
      dailyData[date].activities += 1;
    }

    // Convert to array and sort by date
    const dailyArray = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get time limit info
    const timeCheck = await ParentalControlModel.checkTimeLimit(childId);

    return {
      dailyData: dailyArray,
      timeLimit: timeCheck,
      totalMinutes: dailyArray.reduce((sum, d) => sum + d.minutes, 0),
      averageMinutesPerDay: dailyArray.length > 0 
        ? Math.round(dailyArray.reduce((sum, d) => sum + d.minutes, 0) / dailyArray.length)
        : 0
    };
  }
}
