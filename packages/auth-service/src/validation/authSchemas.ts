import { z } from 'zod';

/**
 * Validation schemas for authentication endpoints
 * Implements requirement 9.4 - Request validation
 */

// Password validation rules
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

// Registration schema
export const RegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters')
    .trim(),
  role: z.enum(['student', 'parent'], {
    errorMap: () => ({ message: 'Role must be either student or parent' }),
  }),
  age: z
    .number()
    .int('Age must be an integer')
    .min(5, 'Age must be at least 5')
    .max(120, 'Age must not exceed 120')
    .optional(),
  grade: z
    .number()
    .int('Grade must be an integer')
    .min(1, 'Grade must be at least 1')
    .max(12, 'Grade must not exceed 12')
    .optional(),
  subjects: z
    .array(z.string().trim())
    .max(20, 'Cannot select more than 20 subjects')
    .optional(),
});

// Login schema
export const LoginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must not exceed 128 characters'),
});

// Refresh token schema
export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

// Email verification schema
export const VerifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, 'Verification token is required')
    .max(500, 'Invalid token format'),
});

// Password reset request schema
export const RequestPasswordResetSchema = z.object({
  email: emailSchema,
});

// Password reset schema
export const ResetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required')
    .max(500, 'Invalid token format'),
  password: passwordSchema,
});

// Change password schema
export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required')
    .max(128, 'Password must not exceed 128 characters'),
  newPassword: passwordSchema,
});

// Logout schema
export const LogoutSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
    .optional(),
});
