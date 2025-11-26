import { UserProfile, UserRole } from './user';

export interface RegistrationData {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  age?: number;
  grade?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
