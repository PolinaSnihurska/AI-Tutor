import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateAdmin = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };

      // Verify admin role
      if (decoded.role !== 'admin') {
        res.status(403).json({ error: 'Access denied. Admin role required.' });
        return;
      }

      // Verify admin still exists and is not locked
      const admin = await Admin.findById(decoded.userId);
      if (!admin) {
        res.status(401).json({ error: 'Admin account not found' });
        return;
      }

      if (await Admin.isLocked(admin)) {
        res.status(403).json({ error: 'Account is temporarily locked due to failed login attempts' });
        return;
      }

      req.admin = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireSuperAdmin = (req: AdminRequest, res: Response, next: NextFunction): void => {
  if (req.admin?.role !== 'super_admin') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
};
