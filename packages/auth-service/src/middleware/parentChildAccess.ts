import { Request, Response, NextFunction } from 'express';
import { ParentChildLink } from '../models';

/**
 * Middleware to verify parent has access to child's data
 * Expects childId in request params or body
 */
export async function verifyParentChildAccess(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    // Only parents need this verification
    if (req.user.role !== 'parent') {
      return next();
    }
    
    // Get child ID from params or body
    const childId = req.params.childId || req.body.childId || req.query.childId;
    
    if (!childId) {
      return res.status(400).json({
        success: false,
        error: 'Child ID is required',
      });
    }
    
    // Verify parent-child relationship exists
    const hasAccess = await ParentChildLink.exists(req.user.userId, childId as string);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this child\'s data',
      });
    }
    
    next();
  } catch (error) {
    console.error('Parent-child access verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify access',
    });
  }
}

/**
 * Middleware to verify user can only access their own data or their children's data
 * Expects userId in request params
 */
export async function verifyResourceAccess(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const targetUserId = req.params.userId || req.body.userId || req.query.userId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    // Admins can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Users can access their own resources
    if (req.user.userId === targetUserId) {
      return next();
    }
    
    // Parents can access their children's resources
    if (req.user.role === 'parent') {
      const hasAccess = await ParentChildLink.exists(req.user.userId, targetUserId as string);
      
      if (hasAccess) {
        return next();
      }
    }
    
    return res.status(403).json({
      success: false,
      error: 'You do not have access to this resource',
    });
  } catch (error) {
    console.error('Resource access verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify access',
    });
  }
}

/**
 * Middleware to ensure user can only modify their own account
 * Admins can modify any account
 */
export function verifySelfOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }
  
  const targetUserId = req.params.userId || req.body.userId;
  
  if (!targetUserId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required',
    });
  }
  
  // Admins can modify any account
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Users can only modify their own account
  if (req.user.userId === targetUserId) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    error: 'You can only modify your own account',
  });
}
