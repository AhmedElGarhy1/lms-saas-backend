import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginRequestDto } from '../dto/login.dto';
import { SignupRequestDto } from '../dto/signup.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { VerifyEmailRequestDto } from '../dto/verify-email.dto';
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
    try {
      const result = await this.authService.login(loginDto);

      return ControllerResponse.success(
        result,
        this.i18n.translate('success.login'),
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw error;
    }
  }

  @Public()
  @Post('signup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  @CreateApiResponses('User registration')
  @ApiBody({ type: SignupRequestDto })
  @Transactional()
  async signup(@Body() signupDto: SignupRequestDto) {
    const result = await this.authService.signup(signupDto);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.userRegistered'),
    );
  }

  @Post('refresh')
  @Public()
  @UseGuards(RefreshJwtGuard)
  @ReadApiResponses('Refresh access token')
  async refreshToken(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;

    const result = await this.authService.refresh(userId, refreshToken);
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

  @Post('forgot-password')
  @Public()
  @UpdateApiResponses('Request password reset')
  @ApiBody({ type: ForgotPasswordRequestDto })
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    const result = await this.authService.forgotPassword(dto);

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
    try {
      const result = await this.authService.verify2FA(dto);

      return ControllerResponse.success(
        result,
        this.i18n.translate('success.twoFactorVerified'),
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw error;
    }
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
