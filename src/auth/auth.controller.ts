import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { User } from '@prisma/client';
import { Public } from '../shared/decorators/public.decorator';
import { SignupRequestSchema, SignupRequest } from './dto/signup.dto';
import { LoginRequestSchema, LoginRequest } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  VerifyEmailRequestSchema,
  VerifyEmailRequest,
} from './dto/verify-email.dto';
import {
  ForgotPasswordRequestSchema,
  ForgotPasswordRequest,
} from './dto/forgot-password.dto';
import {
  ResetPasswordRequestSchema,
  ResetPasswordRequest,
} from './dto/reset-password.dto';
import {
  TwoFASetupRequestSchema,
  TwoFASetupRequest,
  TwoFAVerifyRequestSchema,
  TwoFAVerifyRequest,
} from './dto/2fa.dto';
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { SignupRequestDto } from './dto/signup.dto';
import { LoginRequestDto } from './dto/login.dto';
import { VerifyEmailRequestDto } from './dto/verify-email.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password.dto';
import { ResetPasswordRequestDto } from './dto/reset-password.dto';
import { TwoFASetupDto } from './dto/2fa.dto';
import { TwoFAVerifyDto } from './dto/2fa.dto';

class SignupExample {
  @ApiProperty({
    description: 'User email',
    example: 'test@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;
}

class LoginExample {
  @ApiProperty({
    description: 'User email',
    example: 'test@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  password: string;
}

class RefreshTokenExample {
  @ApiProperty({
    description: 'Refresh token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxNzI4NzI4MDAwLCJpYXQiOjE3Mjg3MjQwMDB9.1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  refreshToken: string;
}

class VerifyEmailExample {
  @ApiProperty({
    description: 'Verification code',
    example: '123456',
  })
  code: string;
}

class ForgotPasswordExample {
  @ApiProperty({
    description: 'User email',
    example: 'test@example.com',
  })
  email: string;
}

class ResetPasswordExample {
  @ApiProperty({
    description: 'New password',
    example: 'newpassword123',
  })
  password: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'newpassword123',
  })
  confirmPassword: string;
}

class TwoFASetupExample {
  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  password: string;
}

class TwoFAVerifyExample {
  @ApiProperty({
    description: 'Verification code',
    example: '123456',
  })
  code: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({
    status: 201,
    description: 'Signup successful',
    schema: { example: SignupExample },
  })
  @ApiBody({ type: SignupRequestDto })
  async signup(
    @Body(new ZodValidationPipe(SignupRequestSchema)) dto: SignupRequest,
  ) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: { example: LoginExample },
  })
  @ApiBody({ type: LoginRequestDto })
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) dto: LoginRequest,
  ) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed',
    schema: { example: RefreshTokenExample },
  })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email' })
  @ApiResponse({
    status: 200,
    description: 'Email verified',
    schema: { example: VerifyEmailExample },
  })
  @ApiBody({ type: VerifyEmailRequestDto })
  async verifyEmail(
    @Body(new ZodValidationPipe(VerifyEmailRequestSchema))
    dto: VerifyEmailRequest,
  ) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Reset link sent',
    schema: { example: ForgotPasswordExample },
  })
  @ApiBody({ type: ForgotPasswordRequestDto })
  async forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordRequestSchema))
    dto: ForgotPasswordRequest,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: { example: ResetPasswordExample },
  })
  @ApiBody({ type: ResetPasswordRequestDto })
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordRequestSchema))
    dto: ResetPasswordRequest,
  ) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@GetUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA (returns QR code)' })
  @ApiResponse({
    status: 200,
    description: '2FA QR code and secret',
    schema: { example: TwoFASetupExample },
  })
  @ApiBody({ type: TwoFASetupDto })
  async setup2FA(
    @Body(new ZodValidationPipe(TwoFASetupRequestSchema))
    dto: TwoFASetupRequest,
  ) {
    return this.authService.setup2FA(dto.password);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA (verify code)' })
  @ApiResponse({
    status: 200,
    description: '2FA enabled',
    schema: { example: TwoFAVerifyExample },
  })
  @ApiBody({
    type: TwoFAVerifyDto,
    examples: {
      user: {
        value: TwoFAVerifyExample,
      },
    },
  })
  async enable2FA(@GetUser() user: User, @Body() dto: TwoFAVerifyRequest) {
    return this.authService.enable2FA(user.id, dto.code);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA (verify code)' })
  @ApiResponse({
    status: 200,
    description: '2FA disabled',
    schema: { example: TwoFAVerifyExample },
  })
  @ApiBody({
    type: TwoFAVerifyDto,
    examples: {
      user: {
        value: TwoFAVerifyExample,
      },
    },
  })
  async disable2FA(@GetUser() user: User, @Body() dto: TwoFAVerifyRequest) {
    return this.authService.disable2FA(user.id, dto.code);
  }
}
