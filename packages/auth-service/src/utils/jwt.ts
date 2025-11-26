import jwt, { SignOptions } from 'jsonwebtoken';
import { TokenPayload } from '@ai-tutor/shared-types';
import { UserRole } from '@ai-tutor/shared-types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenData {
  userId: string;
  email: string;
  role: UserRole;
}

export function generateAccessToken(data: TokenData): string {
  return jwt.sign(
    {
      userId: data.userId,
      email: data.email,
      role: data.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
  );
}

export function generateRefreshToken(data: TokenData): string {
  return jwt.sign(
    {
      userId: data.userId,
      email: data.email,
      role: data.role,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN } as SignOptions
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

export function getTokenExpiresIn(): number {
  // Parse the expires in string (e.g., "15m", "7d") to seconds
  const match = JWT_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 minutes
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}
