import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  AuthenticationFailedException,
  ResourceNotFoundException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { JwtService } from '@nestjs/jwt';
import { Config } from '@/shared/config/config';
import { UserService } from '../../user/services/user.service';
import { VerificationService } from './verification.service';
import * as bcrypt from 'bcrypt';
import { LoginRequestDto } from '../dto/login.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { TwoFactorRequest } from '../dto/2fa.dto';
import { BaseService } from '@/shared/common/services/base.service';
import { User } from '../../user/entities/user.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { VerificationType } from '../enums/verification-type.enum';
import {
  UserLoggedInEvent,
  UserLoggedOutEvent,
  TokenRefreshedEvent,
  TwoFactorSetupEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  PhoneVerifiedEvent,
  UserLoginFailedEvent,
} from '@/modules/auth/events/auth.events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';

@Injectable()
export class AuthService extends BaseService {
  private readonly logger: Logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly verificationService: VerificationService,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService<I18nTranslations>,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  async validateUser(phone: string, password: string): Promise<User | null> {
    const user = await this.userService.findUserByPhone(phone, true);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(dto: LoginRequestDto) {
    const user = await this.userService.findUserByPhone(dto.phone, true);

    // If user exists, validate account status
    if (user) {
      if (!user.isActive) {
        throw new BusinessLogicException(
          this.i18n.translate('t.errors.businessLogicError'),
        );
      }

      // Validate password
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);

      if (!isPasswordValid) {
        // Emit failed login event for activity logging
        await this.typeSafeEventEmitter.emitAsync(
          AuthEvents.USER_LOGIN_FAILED,
          new UserLoginFailedEvent(dto.phone, user.id, 'Invalid password'),
        );

        throw new AuthenticationFailedException(
          this.i18n.translate('t.errors.invalidCredentials'),
        );
      }

      // Password is valid, continue with login
      if (!user.id || user.id.trim() === '') {
        this.logger.error(
          `User object missing or invalid ID for phone: ${dto.phone}`,
        );
        throw new AuthenticationFailedException(
          this.i18n.translate('t.errors.authenticationFailed'),
        );
      }

      // Use user for rest of login flow
      const userForLogin = user;

      // Check if 2FA is enabled
      if (userForLogin.twoFactorEnabled) {
        // Generate and send 2FA OTP (notification system will fetch phone)
        await this.verificationService.sendTwoFactorOTP(userForLogin.id || '');

        return {
          requiresTwoFactor: true,
          message: 'Two-factor authentication required',
          tempToken: this.jwtService.sign(
            { sub: userForLogin.id, phone: userForLogin.phone, temp: true },
            { expiresIn: '5m' },
          ),
        };
      }

      // Generate tokens
      const tokens = this.generateTokens(userForLogin);

      // Hash and store refresh token in database
      const hashedRt = await bcrypt.hash(tokens.refreshToken, 10);
      await this.userService.update(userForLogin.id, { hashedRt });

      // Emit login event for activity logging
      await this.typeSafeEventEmitter.emitAsync(
        AuthEvents.USER_LOGGED_IN,
        new UserLoggedInEvent(
          userForLogin.id || '',
          userForLogin.phone || '',
          null as any,
        ),
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: userForLogin.id,
          phone: userForLogin.phone,
          name: userForLogin.name,
          isActive: userForLogin.isActive,
          twoFactorEnabled: userForLogin.twoFactorEnabled,
        },
      };
    } else {
      // User doesn't exist - return same error message to prevent enumeration
      throw new AuthenticationFailedException(
        this.i18n.translate('t.errors.invalidCredentials'),
      );
    }
  }

  async verify2FA(dto: TwoFactorRequest) {
    if (!dto.userId) {
      throw new BadRequestException(this.i18n.translate('t.errors.badRequest'));
    }

    // Find user by userId
    const user = await this.userService.findOne(dto.userId, true);

    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('t.errors.userNotFound'),
      );
    }

    if (!user.twoFactorEnabled) {
      throw new BusinessLogicException(
        this.i18n.translate('t.errors.businessLogicError'),
      );
    }

    // Verify OTP code using VerificationService
    try {
      await this.verificationService.verifyCode(
        dto.code,
        VerificationType.TWO_FACTOR_AUTH,
        dto.userId,
      );
    } catch (error) {
      this.logger.error('Invalid 2FA OTP code provided', {
        userId: user.id,
        phone: user.phone,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AuthenticationFailedException(
        this.i18n.translate('t.errors.authenticationFailed'),
      );
    }

    // Generate final tokens
    const tokens = this.generateTokens(user);

    // Hash and store refresh token in database
    const hashedRt = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userService.update(user.id, { hashedRt });

    // Emit login event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.USER_LOGGED_IN,
      new UserLoggedInEvent(user.id || '', user.phone || '', null as any),
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async requestPhoneVerification(
    userId?: string,
    phone?: string,
  ): Promise<void> {
    let user;

    // Find user by userId or phone
    if (userId) {
      user = await this.userService.findOne(userId);
    } else if (phone) {
      user = await this.userService.findUserByPhone(phone);
    } else {
      throw new BadRequestException(this.i18n.translate('t.errors.badRequest'));
    }

    if (!user) {
      throw new NotFoundException(this.i18n.translate('t.errors.userNotFound'));
    }

    // Send phone verification OTP (notification system will fetch phone)
    await this.verificationService.sendPhoneVerification(user.id || '');
  }

  async verifyPhone(code: string, userId: string): Promise<void> {
    let verifiedUserId: string;
    try {
      const result = await this.verificationService.verifyCode(
        code,
        VerificationType.OTP_VERIFICATION,
        userId,
      );
      verifiedUserId = result.userId;
    } catch (error: unknown) {
      this.logger.error(
        'Phone verification failed - invalid or expired code',
        error,
        { userId },
      );
      throw error;
    }

    // Update user phoneVerified date
    await this.userService.update(verifiedUserId, {
      phoneVerified: new Date(),
    });

    // Emit phone verified event (notification system will fetch user and phone)
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.PHONE_VERIFIED,
      new PhoneVerifiedEvent(verifiedUserId),
    );
  }

  async forgotPassword(dto: ForgotPasswordRequestDto, actor: ActorUser) {
    // Find user by phone
    let user;
    if (actor) {
      user = actor;
    } else if (dto.phone) {
      user = await this.userService.findUserByPhone(dto.phone);
    } else {
      throw new BadRequestException(this.i18n.translate('t.errors.badRequest'));
    }

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If an account exists, a password reset code has been sent.',
      };
    }

    // Send password reset OTP (channel selection handled by notification system)
    await this.verificationService.sendPasswordReset(user.id);

    return {
      message: 'If an account exists, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordRequestDto) {
    // Code-only password reset
    await this.verificationService.resetPassword(
      dto.code,
      dto.newPassword,
      dto.userId,
    );

    return {
      success: true,
      message: this.i18n.translate('t.success.passwordReset'),
    };
  }

  async setupTwoFactor(userId: string, actor: ActorUser) {
    const user = await this.userService.findOne(userId, true);

    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('t.errors.userNotFound'),
      );
    }

    if (user.twoFactorEnabled) {
      throw new BusinessLogicException(
        this.i18n.translate('t.errors.businessLogicError'),
      );
    }

    // Send OTP for 2FA setup (notification system will fetch phone)
    await this.verificationService.sendTwoFactorOTP(userId);

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_SETUP,
      new TwoFactorSetupEvent(userId, actor),
    );

    return {
      message:
        '2FA setup OTP sent to your phone. Verify the code to enable 2FA.',
    };
  }

  async enableTwoFactor(
    userId: string,
    verificationCode: string,
    actor: ActorUser,
  ) {
    const user = await this.userService.findOne(userId, true);

    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('t.errors.userNotFound'),
      );
    }

    if (user.twoFactorEnabled) {
      throw new BusinessLogicException(
        this.i18n.translate('t.errors.businessLogicError'),
      );
    }

    // Verify the OTP code
    try {
      await this.verificationService.verifyCode(
        verificationCode,
        VerificationType.TWO_FACTOR_AUTH,
        userId,
      );
    } catch (error) {
      throw new AuthenticationFailedException(
        this.i18n.translate('t.errors.authenticationFailed'),
      );
    }

    // Enable 2FA (no secret needed for SMS OTP)
    await this.userService.updateUserTwoFactor(userId, true);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_ENABLED,
      new TwoFactorEnabledEvent(userId, actor),
    );

    return { message: this.i18n.translate('t.success.twoFactorEnabled') };
  }

  async disableTwoFactor(
    userId: string,
    verificationCode: string,
    actor: ActorUser,
  ) {
    const user = await this.userService.findOne(userId, true);

    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('t.errors.userNotFound'),
      );
    }

    if (!user.twoFactorEnabled) {
      throw new BusinessLogicException(
        this.i18n.translate('t.errors.businessLogicError'),
      );
    }

    // Verify the OTP code
    try {
      await this.verificationService.verifyCode(
        verificationCode,
        VerificationType.TWO_FACTOR_AUTH,
        userId,
      );
    } catch (error) {
      this.logger.error('Invalid 2FA OTP code for disable', {
        userId: user.id,
        phone: user.phone,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AuthenticationFailedException(
        this.i18n.translate('t.errors.authenticationFailed'),
      );
    }

    // Disable 2FA
    await this.userService.updateUserTwoFactor(userId, false);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_DISABLED,
      new TwoFactorDisabledEvent(userId, actor),
    );

    return { message: this.i18n.translate('t.success.twoFactorDisabled') };
  }

  async logout(actor: ActorUser) {
    // Clear hashed refresh token from database
    await this.userService.update(actor.id, { hashedRt: null });

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.USER_LOGGED_OUT,
      new UserLoggedOutEvent(actor.id, actor),
    );

    return { message: this.i18n.translate('t.success.logout') };
  }

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      phone: user.phone,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' },
      {
        expiresIn: Config.jwt.expiresIn,
      },
    );
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        expiresIn: Config.jwt.refreshExpiresIn,
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  decodeToken(token: string): unknown {
    return this.jwtService.decode(token);
  }

  async refresh(userId: string) {
    // Get user (validation already done by strategy)
    const user = await this.userService.findOne(userId, true);
    if (!user) {
      throw new AuthenticationFailedException(
        this.i18n.translate('t.errors.userNotFound'),
      );
    }

    // Generate new tokens
    const tokens = this.generateTokens(user);

    // Update hashed refresh token in database (token rotation)
    await this.userService.update(user.id, {
      hashedRt: await bcrypt.hash(tokens.refreshToken, 10),
    });

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TOKEN_REFRESHED,
      new TokenRefreshedEvent(userId, null as any),
    );

    return tokens;
  }
}
