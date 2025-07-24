import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/signup.dto';
import { LoginRequestDto } from './dto/login.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password.dto';
import { ResetPasswordRequestDto } from './dto/reset-password.dto';
import { VerifyEmailRequestDto } from './dto/verify-email.dto';
import { TwoFASetupRequestDto, TwoFAVerifyRequestDto } from './dto/2fa.dto';
import { Public } from '../shared/decorators/public.decorator';
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
} from './dto/auth-response.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser } from '../shared/types/current-user.type';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: SignupResponseDto,
  })
  @ApiBody({ type: SignupRequestDto })
  async signup(@Body() dto: SignupRequestDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiBody({ type: LoginRequestDto })
  async login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
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

  @Post('2fa/setup')
  @ApiOperation({ summary: 'Setup 2FA for user' })
  @ApiResponse({
    status: 200,
    description: '2FA setup initiated',
    type: TwoFASetupResponseDto,
  })
  @ApiBody({ type: TwoFASetupRequestDto })
  async setup2FA(@Body() dto: TwoFASetupRequestDto) {
    return this.authService.setup2FA(dto.password);
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify 2FA code' })
  @ApiResponse({
    status: 200,
    description: '2FA verification result',
    type: TwoFAVerifyResponseDto,
  })
  @ApiBody({ type: TwoFAVerifyRequestDto })
  async verify2FA(@Body() dto: TwoFAVerifyRequestDto) {
    return this.authService.verify2FA(dto.code);
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  async logout(@GetUser() user: CurrentUser) {
    return this.authService.logout(user.id);
  }
}
