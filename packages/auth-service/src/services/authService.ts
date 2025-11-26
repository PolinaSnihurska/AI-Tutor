import { User, Subscription } from '../models';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getTokenExpiresIn } from '../utils/jwt';
import { generateVerificationToken, generatePasswordResetToken, getTokenExpiration } from '../utils/tokens';
import { RegistrationData, AuthResponse, LoginCredentials } from '@ai-tutor/shared-types';

export class AuthService {
  async register(data: RegistrationData): Promise<AuthResponse> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await User.create({
      email: data.email,
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      age: data.age,
      grade: data.grade,
    });

    // Create default free subscription
    await Subscription.create({
      userId: user.id,
      plan: 'free',
      status: 'active',
    });

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = getTokenExpiration(24);
    await User.setEmailVerificationToken(user.id, verificationToken, verificationExpires);

    // TODO: Send verification email
    console.log(`Verification token for ${user.email}: ${verificationToken}`);

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken,
      user: User.toProfile(user),
      expiresIn: getTokenExpiresIn(),
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Find user by email
    const user = await User.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(credentials.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken,
      user: User.toProfile(user),
      expiresIn: getTokenExpiresIn(),
    };
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    // Verify refresh token
    const payload = verifyRefreshToken(token);

    // Get user
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken,
      user: User.toProfile(user),
      expiresIn: getTokenExpiresIn(),
    };
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await User.findByEmailVerificationToken(token);
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await User.verifyEmail(user.id);
    return true;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = generatePasswordResetToken();
    const resetExpires = getTokenExpiration(1); // 1 hour
    await User.setPasswordResetToken(user.id, resetToken, resetExpires);

    // TODO: Send password reset email
    console.log(`Password reset token for ${user.email}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    const user = await User.findByPasswordResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);
    await User.updatePassword(user.id, passwordHash);
    await User.clearPasswordResetToken(user.id);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    const passwordHash = await hashPassword(newPassword);
    await User.updatePassword(userId, passwordHash);
  }
}
