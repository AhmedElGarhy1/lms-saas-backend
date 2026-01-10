import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UserService } from '@/modules/user/services/user.service';
import { LoginRequestDto } from '../dto/login.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { VerifyPhoneRequestDto } from '../dto/verify-phone.dto';
import { RequestPhoneVerificationRequestDto } from '../dto/request-phone-verification.dto';
import { TwoFAVerifyRequestDto } from '../dto/2fa.dto';
import { ChangePasswordRequestDto } from '@/modules/user/dto/change-password.dto';
import { Public } from '@/shared/common/decorators/public.decorator';
import { Transactional } from '@nestjs-cls/transactional';
import { RateLimit } from '@/modules/rate-limit/decorators/rate-limit.decorator';
import { ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger';
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
} from '@/shared/common/decorators/api-responses.decorator';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { RefreshJwtGuard } from '../guards/refresh-jwt.guard';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';
import { NoPhoneVerification } from '@/shared/common/decorators/no-phone-verification.decorator';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    phone: string;
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
    private readonly userService: UserService,
    private readonly verificationTokenRepository: VerificationTokenRepository,
  ) {}

  @Public()
  @Post('login')
  @RateLimit({ limit: 5, windowSeconds: 60 }) // 5 attempts per minute
  @ReadApiResponses('User login')
  @ApiBody({ type: LoginRequestDto })
  @Transactional()
  async login(@Body() loginDto: LoginRequestDto) {
    const result = await this.authService.login(loginDto);

    return ControllerResponse.success(result);
  }

  @Public()
  @Post('resend-login-otp')
  @RateLimit({ limit: 3, windowSeconds: 60 }) // 3 resends per minute
  @UpdateApiResponses('Resend login OTP code')
  @ApiOperation({ summary: 'Resend login OTP code for 2FA' })
  @ApiBody({ type: LoginRequestDto })
  async resendLoginOTP(@Body() dto: LoginRequestDto) {
    await this.authService.resendLoginOTP(dto.phone, dto.password);

    return ControllerResponse.success(null);
  }

  @Public()
  @Post('signup')
  @RateLimit({ limit: 3, windowSeconds: 300 }) // 3 attempts per 5 minutes
  @CreateApiResponses('User registration')
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
    return ControllerResponse.success(result);
  }

  @Post('request-phone-verification')
  @RateLimit({ limit: 1, windowSeconds: 60 }) // 1 request per minute
  @UpdateApiResponses('Request phone verification')
  @ApiBody({ type: RequestPhoneVerificationRequestDto })
  @NoProfile()
  @NoPhoneVerification()
  async requestPhoneVerification(
    @Body() dto: RequestPhoneVerificationRequestDto,
  ) {
    await this.authService.requestPhoneVerification(dto.userId, dto.phone);

    return ControllerResponse.success(null);
  }

  @Post('verify-phone')
  @RateLimit({ limit: 5, windowSeconds: 60 }) // 5 attempts per minute
  @UpdateApiResponses('Verify phone number with OTP code')
  @ApiBody({ type: VerifyPhoneRequestDto })
  @NoProfile()
  @Transactional()
  @NoPhoneVerification()
  async verifyPhone(
    @Body() dto: VerifyPhoneRequestDto,
    @GetUser() user: ActorUser,
  ) {
    await this.authService.verifyPhone(dto.code, dto.userId || user.id);

    return ControllerResponse.success(null);
  }

  @Post('forgot-password')
  @Public()
  @UpdateApiResponses('Request password reset')
  @ApiBody({ type: ForgotPasswordRequestDto })
  @RateLimit({ limit: 1, windowSeconds: 60 })
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.authService.forgotPassword(dto, actor);

    return ControllerResponse.success(result);
  }

  @Post('reset-password')
  @Public()
  @UpdateApiResponses('Reset password with token')
  @ApiBody({ type: ResetPasswordRequestDto })
  @Transactional()
  @RateLimit({ limit: 5, windowSeconds: 60 }) // 5 attempts per minute
  async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    const result = await this.authService.resetPassword(dto);

    return ControllerResponse.success(result);
  }

  @Post('setup-2fa')
  @RateLimit({ limit: 1, windowSeconds: 60 }) // 1 attempt per minute
  @CreateApiResponses('Setup two-factor authentication')
  @Transactional()
  @NoProfile()
  async setup2FA(@GetUser() actor: ActorUser) {
    const result = await this.authService.setupTwoFactor(actor);

    return ControllerResponse.success(result);
  }

  @Post('enable-2fa')
  @RateLimit({ limit: 5, windowSeconds: 60 }) // 5 attempts per minute
  @UpdateApiResponses('Enable two-factor authentication')
  @ApiBody({ type: TwoFAVerifyRequestDto })
  @Transactional()
  @NoProfile()
  async enable2FA(
    @Body() dto: TwoFAVerifyRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.authService.enableTwoFactor(dto.code, actor);

    return ControllerResponse.success(result);
  }

  @Post('disable-2fa')
  @UpdateApiResponses('Disable two-factor authentication')
  @ApiBody({ type: TwoFAVerifyRequestDto })
  @Transactional()
  @NoProfile()
  async disable2FA(
    @Body() dto: TwoFAVerifyRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.authService.disableTwoFactor(dto.code, actor);

    return ControllerResponse.success(result);
  }

  @Post('logout')
  @UpdateApiResponses('User logout')
  @Transactional()
  @NoProfile()
  async logout(@GetUser() user: ActorUser) {
    const result = await this.authService.logout(user);

    return ControllerResponse.success(result);
  }

  @Patch('change-password')
  @UpdateApiResponses('Change password')
  @ApiBody({ type: ChangePasswordRequestDto })
  @ApiOperation({ summary: 'Change user password' })
  @NoProfile()
  @Transactional()
  async changePassword(
    @Body() dto: ChangePasswordRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.userService.changePassword({
      userId: actor.id,
      dto,
    });

    return ControllerResponse.success(result);
  }

}
