import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginRequestDto } from '../dto/login.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { VerifyEmailRequestDto } from '../dto/verify-email.dto';
import { VerifyPhoneRequestDto } from '../dto/verify-phone.dto';
import { RequestEmailVerificationRequestDto } from '../dto/request-email-verification.dto';
import { RequestPhoneVerificationRequestDto } from '../dto/request-phone-verification.dto';
import {
  TwoFASetupRequestDto,
  TwoFAVerifyRequestDto,
  TwoFactorRequest,
} from '../dto/2fa.dto';
import { Public } from '@/shared/common/decorators/public.decorator';
import { Transactional } from '@nestjs-cls/transactional';
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
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { RefreshJwtGuard } from '../guards/refresh-jwt.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    name: string;
    type: 'refresh';
    refreshToken: string;
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Public()
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ReadApiResponses('User login')
  @ApiBody({ type: LoginRequestDto })
  @Transactional()
  async login(@Body() loginDto: LoginRequestDto) {
    const result = await this.authService.login(loginDto);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.login'),
    );
  }

  @Public()
  @Post('signup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  @CreateApiResponses('User registration')
  @Transactional()
  signup(): never {
    // Signup is not implemented - users should be created through user management endpoints
    throw new Error(
      'Signup is not implemented. Please use user management endpoints.',
    );
  }

  @Post('refresh')
  @Public()
  @UseGuards(RefreshJwtGuard)
  @ReadApiResponses('Refresh access token')
  async refreshToken(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;

    const result = await this.authService.refresh(userId);
    return ControllerResponse.success(
      result,
      this.i18n.translate('success.tokenRefreshed'),
    );
  }

  @Post('verify-email')
  @Public()
  @UpdateApiResponses('Verify email address')
  @ApiBody({ type: VerifyEmailRequestDto })
  @Transactional()
  async verifyEmail(@Body() dto: VerifyEmailRequestDto) {
    const result = await this.authService.verifyEmail(dto);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.emailVerified'),
    );
  }

  @Post('request-email-verification')
  @Public()
  @UpdateApiResponses('Request email verification')
  @ApiBody({ type: RequestEmailVerificationRequestDto })
  async requestEmailVerification(
    @Body() dto: RequestEmailVerificationRequestDto,
  ) {
    await this.authService.requestEmailVerification(dto.userId, dto.email);

    return ControllerResponse.success(
      { message: 'Email verification request sent' },
      this.i18n.translate('success.emailVerified'),
    );
  }

  @Post('request-phone-verification')
  @Public()
  @UpdateApiResponses('Request phone verification')
  @ApiBody({ type: RequestPhoneVerificationRequestDto })
  async requestPhoneVerification(
    @Body() dto: RequestPhoneVerificationRequestDto,
  ) {
    await this.authService.requestPhoneVerification(dto.userId, dto.phone);

    return ControllerResponse.success(
      { message: 'Phone verification request sent' },
      this.i18n.translate('success.emailVerified'), // Use existing translation key
    );
  }

  @Post('verify-phone')
  @UpdateApiResponses('Verify phone number with OTP code')
  @ApiBody({ type: VerifyPhoneRequestDto })
  @Transactional()
  async verifyPhone(
    @Body() dto: VerifyPhoneRequestDto,
    @GetUser() user: ActorUser,
  ) {
    await this.authService.verifyPhone(dto.code, dto.userId || user.id);

    return ControllerResponse.success(
      { message: 'Phone verified successfully' },
      this.i18n.translate('success.emailVerified'), // Use existing translation key
    );
  }

  @Post('forgot-password')
  @Public()
  @UpdateApiResponses('Request password reset')
  @ApiBody({ type: ForgotPasswordRequestDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.authService.forgotPassword(dto, actor);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.passwordResetSent'),
    );
  }

  @Post('reset-password')
  @Public()
  @UpdateApiResponses('Reset password with token')
  @ApiBody({ type: ResetPasswordRequestDto })
  @Transactional()
  async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    const result = await this.authService.resetPassword(dto);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.passwordReset'),
    );
  }

  @Post('setup-2fa')
  @Public()
  @CreateApiResponses('Setup two-factor authentication')
  @ApiBody({ type: TwoFASetupRequestDto })
  @Transactional()
  async setup2FA(
    @Body() dto: TwoFASetupRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.authService.setupTwoFactor(dto.email, actor);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.twoFactorSetup'),
    );
  }

  @Post('verify-2fa')
  @Public()
  @UpdateApiResponses('Verify two-factor authentication code')
  @ApiBody({ type: TwoFAVerifyRequestDto })
  @Transactional()
  async verify2FA(@Body() dto: TwoFactorRequest) {
    const result = await this.authService.verify2FA(dto);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.twoFactorVerified'),
    );
  }

  @Post('logout')
  @UpdateApiResponses('User logout')
  @Transactional()
  async logout(@GetUser() user: ActorUser) {
    const result = await this.authService.logout(user);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.logout'),
    );
  }
}
