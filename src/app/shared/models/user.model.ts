import { Country } from "./country.model";

export interface User {
  id: string;
  avatar: string | null;
  username: string;
  email: string;
  birthDate: Date;
  country: Country;
  phone: string;
  website: string;
  isVerified: boolean;
  verificationMethod: 'email' | 'phone';
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationSession {
  userId: string;
  code: string;
  method: 'email' | 'phone';
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  avatar: string | null;
  username: string;
  email: string;
  birthDate: Date;
  country: Country;
  phone: string;
  website: string;
  verificationMethod: 'email' | 'phone';
}

export interface AuthUser {
  user: User;
}

