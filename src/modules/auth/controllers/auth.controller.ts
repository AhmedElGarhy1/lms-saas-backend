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
import { ApiTags, ApiBody } from '@nestjs/swagger';
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
} from '@/shared/common/decorators/api-responses.decorator';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
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
  @ReadApiResponses('User login')
  @ApiBody({ type: LoginRequestDto })
  async login(@Body() loginDto: LoginRequestDto) {
    const result = await this.authService.login(loginDto);
    return ControllerResponse.success(result, 'Login successful');
  }

  @Public()
  @Post('signup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  @CreateApiResponses('User registration')
  @ApiBody({ type: SignupRequestDto })
  async signup(@Body() signupDto: SignupRequestDto) {
    const result = await this.authService.signup(signupDto);
    return ControllerResponse.success(result, 'User registered successfully');
  }

  @Post('refresh')
  @Public()
  @ReadApiResponses('Refresh access token')
  @ApiBody({ type: RefreshTokenRequestDto })
  async refreshToken(@Body() dto: RefreshTokenRequestDto) {
    const result = await this.authService.refreshToken({
      refreshToken: dto.refreshToken,
    });
    return ControllerResponse.success(result, 'Token refreshed successfully');
  }

  @Post('verify-email')
  @Public()
  @UpdateApiResponses('Verify email address')
  @ApiBody({ type: VerifyEmailRequestDto })
  async verifyEmail(@Body() dto: VerifyEmailRequestDto) {
    const result = await this.authService.verifyEmail(dto);
    return ControllerResponse.success(result, 'Email verified successfully');
  }

  @Post('forgot-password')
  @Public()
  @UpdateApiResponses('Request password reset')
  @ApiBody({ type: ForgotPasswordRequestDto })
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    const result = await this.authService.forgotPassword(dto);
    return ControllerResponse.success(result, 'Password reset email sent');
  }

  @Post('reset-password')
  @Public()
  @UpdateApiResponses('Reset password with token')
  @ApiBody({ type: ResetPasswordRequestDto })
  async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    const result = await this.authService.resetPassword(dto);
    return ControllerResponse.success(result, 'Password reset successfully');
  }

  @Post('setup-2fa')
  @Public()
  @CreateApiResponses('Setup two-factor authentication')
  @ApiBody({ type: TwoFASetupRequestDto })
  async setup2FA(@Body() dto: TwoFASetupRequestDto) {
    const result = await this.authService.setupTwoFactor(dto.email);
    return ControllerResponse.success(result, '2FA setup initiated');
  }

  @Post('verify-2fa')
  @Public()
  @UpdateApiResponses('Verify two-factor authentication code')
  @ApiBody({ type: TwoFAVerifyRequestDto })
  async verify2FA(@Body() dto: TwoFactorRequest) {
    const result = await this.authService.verify2FA(dto);
    return ControllerResponse.success(result, '2FA verification completed');
  }

  @Post('logout')
  @UpdateApiResponses('User logout')
  async logout(@GetUser() user: ActorUser) {
    const result = await this.authService.logout(user);
    return ControllerResponse.success(result, 'Logout successful');
  }
}
