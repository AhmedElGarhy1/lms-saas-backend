import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Login Response Schema
export const LoginResponseSchema = z.object({
  accessToken: z.string().describe('JWT access token'),
  refreshToken: z.string().describe('JWT refresh token'),
  user: z
    .object({
      id: z.string().describe('User ID'),
      email: z.string().email().describe('User email'),
      name: z.string().describe('User name'),
      isActive: z.boolean().describe('User active status'),
      isEmailVerified: z.boolean().describe('Email verification status'),
      twoFactorEnabled: z.boolean().describe('2FA enabled status'),
      createdAt: z.date().describe('User creation timestamp'),
      updatedAt: z.date().describe('User last update timestamp'),
    })
    .describe('User information'),
});

// Signup Response Schema
export const SignupResponseSchema = z.object({
  message: z.string().describe('Success message'),
  user: z
    .object({
      id: z.string().describe('User ID'),
      email: z.string().email().describe('User email'),
      name: z.string().describe('User name'),
      isActive: z.boolean().describe('User active status'),
      isEmailVerified: z.boolean().describe('Email verification status'),
      createdAt: z.date().describe('User creation timestamp'),
      updatedAt: z.date().describe('User last update timestamp'),
    })
    .describe('User information'),
});

// Refresh Token Response Schema
export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().describe('New JWT access token'),
  refreshToken: z.string().describe('New JWT refresh token'),
});

// 2FA Setup Response Schema
export const TwoFASetupResponseSchema = z.object({
  qrCode: z.string().describe('QR code data URL for 2FA setup'),
  secret: z.string().describe('2FA secret key'),
  message: z.string().describe('Setup instructions'),
});

// 2FA Verify Response Schema
export const TwoFAVerifyResponseSchema = z.object({
  message: z.string().describe('Verification result message'),
  enabled: z.boolean().describe('Whether 2FA is now enabled'),
});

// Forgot Password Response Schema
export const ForgotPasswordResponseSchema = z.object({
  message: z.string().describe('Success message'),
});

// Reset Password Response Schema
export const ResetPasswordResponseSchema = z.object({
  message: z.string().describe('Success message'),
});

// Verify Email Response Schema
export const VerifyEmailResponseSchema = z.object({
  message: z.string().describe('Verification result message'),
  verified: z.boolean().describe('Whether email is now verified'),
});

// Logout Response Schema
export const LogoutResponseSchema = z.object({
  message: z.string().describe('Logout success message'),
});

// Create DTOs using nestjs-zod
export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}
export class SignupResponseDto extends createZodDto(SignupResponseSchema) {}
export class RefreshTokenResponseDto extends createZodDto(
  RefreshTokenResponseSchema,
) {}
export class TwoFASetupResponseDto extends createZodDto(
  TwoFASetupResponseSchema,
) {}
export class TwoFAVerifyResponseDto extends createZodDto(
  TwoFAVerifyResponseSchema,
) {}
export class ForgotPasswordResponseDto extends createZodDto(
  ForgotPasswordResponseSchema,
) {}
export class ResetPasswordResponseDto extends createZodDto(
  ResetPasswordResponseSchema,
) {}
export class VerifyEmailResponseDto extends createZodDto(
  VerifyEmailResponseSchema,
) {}
export class LogoutResponseDto extends createZodDto(LogoutResponseSchema) {}
