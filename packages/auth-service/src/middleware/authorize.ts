import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@ai-tutor/shared-types';

/**
 * Middleware to check if user has one of the required roles
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }
    
    next();
  };
}

/**
 * Middleware to check if user is a student
 */
export const authorizeStudent = authorize('student');

/**
 * Middleware to check if user is a parent
 */
export const authorizeParent = authorize('parent');

/**
 * Middleware to check if user is an admin
 */
export const authorizeAdmin = authorize('admin');

/**
 * Middleware to check if user is either a student or parent
 */
export const authorizeStudentOrParent = authorize('student', 'parent');
