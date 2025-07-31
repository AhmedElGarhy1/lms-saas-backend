import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
  };
}

export class SignupResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'Whether email verification is required' })
  requiresEmailVerification: boolean;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'New JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'New JWT refresh token' })
  refreshToken: string;
}

export class TwoFASetupResponseDto {
  @ApiProperty({ description: 'QR code for 2FA setup' })
  qrCode: string;

  @ApiProperty({ description: 'Secret key for 2FA' })
  secret: string;
}

export class TwoFAVerifyResponseDto {
  @ApiProperty({ description: 'Whether 2FA verification was successful' })
  success: boolean;

  @ApiProperty({ description: 'JWT access token' })
  accessToken?: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ description: 'Whether password reset email was sent' })
  success: boolean;

  @ApiProperty({ description: 'Message about the password reset process' })
  message: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({ description: 'Whether password was reset successfully' })
  success: boolean;

  @ApiProperty({ description: 'Message about the password reset' })
  message: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({ description: 'Whether email verification was successful' })
  success: boolean;

  @ApiProperty({ description: 'Message about the email verification' })
  message: string;
}

export class LogoutResponseDto {
  @ApiProperty({ description: 'Whether logout was successful' })
  success: boolean;

  @ApiProperty({ description: 'Message about the logout' })
  message: string;
}
