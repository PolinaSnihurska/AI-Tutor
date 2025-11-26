import { Request, Response } from 'express';
import { User } from '../models/User';
import { ParentChildLink } from '../models/ParentChildLink';
import { ParentalControlService } from '../services/parentalControlService';
import { z } from 'zod';

// Validation schema for notification preferences
const NotificationPreferencesSchema = z.object({
  email: z.boolean(),
  inApp: z.boolean(),
  taskReminders: z.boolean(),
  weeklyReports: z.boolean(),
  performanceAlerts: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
});

// Validation schema for parental controls
const ParentalControlsSchema = z.object({
  dailyTimeLimitMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  contentRestrictions: z.array(z.string()).optional(),
  allowedSubjects: z.array(z.string()).nullable().optional(),
  blockedFeatures: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export class ParentController {
  /**
   * Get notification preferences for parent
   */
  async getNotificationPreferences(req: Request, res: Response) {
    try {
      const parentId = req.user?.userId;
      
      if (!parentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const user = await User.findById(parentId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      
      // Get notification preferences from user preferences
      const preferences = user.preferences?.notifications || {
        email: true,
        inApp: true,
        taskReminders: true,
        weeklyReports: true,
      };
      
      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error('Get notification preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notification preferences',
      });
    }
  }

  /**
   * Update notification preferences for parent
   */
  async updateNotificationPreferences(req: Request, res: Response) {
    try {
      const parentId = req.user?.userId;
      
      if (!parentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Validate input
      const validated = NotificationPreferencesSchema.parse(req.body);
      
      // Get current user
      const user = await User.findById(parentId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      
      // Update preferences
      const updatedUser = await User.update(parentId, {
        preferences: {
          ...user.preferences,
          notifications: validated,
        },
      });
      
      if (!updatedUser) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update preferences',
        });
      }
      
      res.status(200).json({
        success: true,
        data: updatedUser.preferences?.notifications,
        message: 'Notification preferences updated successfully',
      });
    } catch (error) {
      console.error('Update notification preferences error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences',
      });
    }
  }

  /**
   * Get parental controls for a child
   */
  async getParentalControls(req: Request, res: Response) {
    try {
      const parentId = req.user?.userId;
      const { childId } = req.params;
      
      if (!parentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Validate childId format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(childId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid child ID format',
        });
      }
      
      const controls = await ParentalControlService.getControls(parentId, childId);
      
      res.status(200).json({
        success: true,
        data: controls,
      });
    } catch (error) {
      console.error('Get parental controls error:', error);
      
      if (error instanceof Error && error.message === 'Parent-child relationship not found') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Not linked to this child',
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to get parental controls',
      });
    }
  }

  /**
   * Update parental controls for a child
   */
  async updateParentalControls(req: Request, res: Response) {
    try {
      const parentId = req.user?.userId;
      const { childId } = req.params;
      
      if (!parentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Validate childId format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(childId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid child ID format',
        });
      }
      
      // Validate input
      const validated = ParentalControlsSchema.parse(req.body);
      
      const controls = await ParentalControlService.updateControls(parentId, childId, validated);
      
      res.status(200).json({
        success: true,
        data: controls,
        message: 'Parental controls updated successfully',
      });
    } catch (error) {
      console.error('Update parental controls error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      if (error instanceof Error && error.message === 'Parent-child relationship not found') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Not linked to this child',
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update parental controls',
      });
    }
  }

  /**
   * Get activity log for a child
   */
  async getChildActivityLog(req: Request, res: Response) {
    try {
      const parentId = req.user?.userId;
      const { childId } = req.params;
      const { startDate, endDate, limit } = req.query;
      
      if (!parentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Validate childId format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(childId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid child ID format',
        });
      }
      
      // Default to last 7 days if not specified
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const maxLimit = limit ? Math.min(parseInt(limit as string), 500) : 100;
      
      const activityLog = await ParentalControlService.getActivityLog(
        parentId,
        childId,
        start,
        end,
        maxLimit
      );
      
      res.status(200).json({
        success: true,
        data: activityLog,
      });
    } catch (error) {
      console.error('Get activity log error:', error);
      
      if (error instanceof Error && error.message === 'Parent-child relationship not found') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Not linked to this child',
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to get activity log',
      });
    }
  }

  /**
   * Get learning time monitoring for a child
   */
  async getLearningTimeMonitoring(req: Request, res: Response) {
    try {
      const parentId = req.user?.userId;
      const { childId } = req.params;
      const { days } = req.query;
      
      if (!parentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Validate childId format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(childId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid child ID format',
        });
      }
      
      const numDays = days ? Math.min(parseInt(days as string), 90) : 7;
      
      const monitoring = await ParentalControlService.getLearningTimeMonitoring(
        parentId,
        childId,
        numDays
      );
      
      res.status(200).json({
        success: true,
        data: monitoring,
      });
    } catch (error) {
      console.error('Get learning time monitoring error:', error);
      
      if (error instanceof Error && error.message === 'Parent-child relationship not found') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Not linked to this child',
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to get learning time monitoring',
      });
    }
  }
}
