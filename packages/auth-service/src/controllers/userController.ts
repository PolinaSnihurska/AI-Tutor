import { Request, Response } from 'express';
import { User, ParentChildLink, Subscription } from '../models';
import { z } from 'zod';

// Validation schema for profile updates with sanitization
const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  age: z.number().int().min(5).max(120).optional(),
  grade: z.number().int().min(1).max(12).optional(),
  subjects: z.array(z.string().trim()).max(20).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    language: z.string().max(10).optional(),
    notifications: z.object({
      email: z.boolean(),
      inApp: z.boolean(),
      taskReminders: z.boolean(),
      weeklyReports: z.boolean(),
    }).optional(),
    concentrationMode: z.boolean().optional(),
  }).optional(),
});

export class UserController {
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      
      // Get subscription info
      const subscription = await Subscription.findByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: {
          ...User.toProfile(user),
          subscription: subscription ? {
            plan: subscription.plan,
            status: subscription.status,
          } : null,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
      });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Validate and sanitize input
      const validatedData = UpdateProfileSchema.parse(req.body);
      
      // Additional sanitization for subjects array
      if (validatedData.subjects) {
        validatedData.subjects = validatedData.subjects
          .filter(s => s.length > 0)
          .map(s => s.trim());
      }
      
      const user = await User.update(userId, validatedData);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      
      res.status(200).json({
        success: true,
        data: User.toProfile(user),
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  }

  async linkChild(req: Request, res: Response) {
    try {
      const parentId = req.user?.userId;
      const { childId } = req.body;
      
      if (!parentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Validate childId format
      const LinkChildSchema = z.object({
        childId: z.string().uuid('Invalid child ID format'),
      });
      
      const validated = LinkChildSchema.parse({ childId });
      
      // Check if child exists
      const child = await User.findById(validated.childId);
      if (!child) {
        return res.status(404).json({
          success: false,
          error: 'Child user not found',
        });
      }
      
      // Check if already linked
      const alreadyLinked = await ParentChildLink.exists(parentId, validated.childId);
      if (alreadyLinked) {
        return res.status(409).json({
          success: false,
          error: 'Child is already linked to this parent',
        });
      }
      
      const link = await ParentChildLink.create({ parentId, childId: validated.childId });
      
      res.status(201).json({
        success: true,
        data: link,
        message: 'Child linked successfully',
      });
    } catch (error) {
      console.error('Link child error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link child',
      });
    }
  }

  async unlinkChild(req: Request, res: Response) {
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
      const UnlinkChildSchema = z.object({
        childId: z.string().uuid('Invalid child ID format'),
      });
      
      const validated = UnlinkChildSchema.parse({ childId });
      
      // Check if link exists
      const linkExists = await ParentChildLink.exists(parentId, validated.childId);
      if (!linkExists) {
        return res.status(404).json({
          success: false,
          error: 'Child link not found',
        });
      }
      
      await ParentChildLink.delete(parentId, validated.childId);
      
      res.status(200).json({
        success: true,
        message: 'Child unlinked successfully',
      });
    } catch (error) {
      console.error('Unlink child error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      res.status(400).json({
        success: false,
        error: 'Failed to unlink child',
      });
    }
  }

  async getChildren(req: Request, res: Response) {
    try {
      const parentId = req.user?.userId;
      
      if (!parentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const children = await ParentChildLink.getChildrenProfiles(parentId);
      
      res.status(200).json({
        success: true,
        data: children,
      });
    } catch (error) {
      console.error('Get children error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get children',
      });
    }
  }
}
