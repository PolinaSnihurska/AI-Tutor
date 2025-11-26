import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { z } from 'zod';

const authService = new AuthService();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student', 'parent']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().int().min(5).max(120).optional(),
  grade: z.number().int().min(1).max(12).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

const RequestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const data = RegisterSchema.parse(req.body);
      const result = await authService.register(data);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful. Please check your email to verify your account.',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const credentials = LoginSchema.parse(req.body);
      const result = await authService.login(credentials);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = RefreshTokenSchema.parse(req.body);
      const result = await authService.refreshToken(refreshToken);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = VerifyEmailSchema.parse(req.body);
      await authService.verifyEmail(token);
      
      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed',
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = RequestPasswordResetSchema.parse(req.body);
      await authService.requestPasswordReset(email);
      
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = ResetPasswordSchema.parse(req.body);
      await authService.resetPassword(token, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      await authService.changePassword(userId, currentPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed',
      });
    }
  }

  async logout(req: Request, res: Response) {
    // For JWT, logout is handled client-side by removing tokens
    // In a production system, you might want to blacklist tokens
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  }
}
