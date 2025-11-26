import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '8h'; // Shorter expiration for admin tokens

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    // Find admin by email
    const admin = await Admin.findByEmail(email);

    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if account is locked
    if (await Admin.isLocked(admin)) {
      res.status(403).json({
        error: 'Account is temporarily locked due to failed login attempts. Please try again later.',
      });
      return;
    }

    // Verify password
    const isValidPassword = await Admin.verifyPassword(admin, password);

    if (!isValidPassword) {
      await Admin.incrementLoginAttempts(admin.id);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Reset login attempts on successful login
    await Admin.resetLoginAttempts(admin.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role,
      },
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdminProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;

    if (!adminId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    res.json({
      id: admin.id,
      email: admin.email,
      firstName: admin.first_name,
      lastName: admin.last_name,
      role: admin.role,
      lastLogin: admin.last_login,
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
