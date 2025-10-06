import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginRequestDto } from '../dto/login.dto';
import { SignupRequestDto } from '../dto/signup.dto';
import { RefreshTokenRequestDto } from '../dto/refresh-token.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { VerifyEmailRequestDto } from '../dto/verify-email.dto';
import {
  TwoFASetupRequestDto,
  TwoFAVerifyRequestDto,
  TwoFactorRequest,
} from '../dto/2fa.dto';
import { Public } from '@/shared/common/decorators/public.decorator';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  LoginResponseDto,
  SignupResponseDto,
  RefreshTokenResponseDto,
  TwoFASetupResponseDto,
  TwoFAVerifyResponseDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
  VerifyEmailResponseDto,
  LogoutResponseDto,
} from '../dto/auth-response.dto';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginRequestDto })
  async login(@Body() loginDto: LoginRequestDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('signup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBody({ type: SignupRequestDto })
  async signup(@Body() signupDto: SignupRequestDto) {
    return this.authService.signup(signupDto);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  async refreshToken(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refreshToken({ refreshToken: dto.refreshToken });
  }

  @Post('verify-email')
  @Public()
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: VerifyEmailResponseDto,
  })
  @ApiBody({ type: VerifyEmailRequestDto })
  async verifyEmail(@Body() dto: VerifyEmailRequestDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  @Public()
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent',
    type: ForgotPasswordResponseDto,
  })
  @ApiBody({ type: ForgotPasswordRequestDto })
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiBody({ type: ResetPasswordRequestDto })
  async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('setup-2fa')
  @Public()
  @ApiOperation({ summary: 'Setup two-factor authentication' })
  @ApiResponse({
    status: 200,
    description: '2FA setup initiated',
    type: TwoFASetupResponseDto,
  })
  @ApiBody({ type: TwoFASetupRequestDto })
  async setup2FA(@Body() dto: TwoFASetupRequestDto) {
    return this.authService.setupTwoFactor(dto.email);
  }

  @Post('verify-2fa')
  @Public()
  @ApiOperation({ summary: 'Verify two-factor authentication code' })
  @ApiResponse({
    status: 200,
    description: '2FA verification completed',
    type: TwoFAVerifyResponseDto,
  })
  @ApiBody({ type: TwoFAVerifyRequestDto })
  async verify2FA(@Body() dto: TwoFactorRequest) {
    return this.authService.verify2FA(dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  async logout(@GetUser() user: ActorUser) {
    return this.authService.logout(user.id);
  }
}
