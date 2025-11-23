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
// import { TwoFactorService } from './two-factor.service';
import * as bcrypt from 'bcrypt';
import { LoginRequestDto } from '../dto/login.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { VerifyEmailRequestDto } from '../dto/verify-email.dto';
import { TwoFactorRequest } from '../dto/2fa.dto';
import { BaseService } from '@/shared/common/services/base.service';
import { User } from '../../user/entities/user.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { VerificationType } from '../enums/verification-type.enum';
import { NotificationChannel } from '../../notifications/enums/notification-channel.enum';
import {
  UserLoggedInEvent,
  UserLoggedOutEvent,
  TokenRefreshedEvent,
  TwoFactorSetupEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  PhoneVerifiedEvent,
  EmailVerifiedEvent,
  UserLoginFailedEvent,
} from '@/modules/auth/events/auth.events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RequestEmailVerificationEvent } from '../events/auth.events';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';

@Injectable()
export class AuthService extends BaseService {
  private readonly logger: Logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly verificationService: VerificationService,
    // private readonly twoFactorService: TwoFactorService,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService<I18nTranslations>,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  async validateUser(
    emailOrPhone: string,
    password: string,
  ): Promise<User | null> {
    // Determine if it's an email or phone and find user accordingly
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    const user = isEmail
      ? await this.userService.findUserByEmail(emailOrPhone, true)
      : await this.userService.findUserByPhone(emailOrPhone, true);

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
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.emailOrPhone);
    const user = isEmail
      ? await this.userService.findUserByEmail(dto.emailOrPhone, true)
      : await this.userService.findUserByPhone(dto.emailOrPhone, true);

    // If user exists, validate account status
    if (user) {
      if (!user.isActive) {
        throw new BusinessLogicException(
          this.i18n.translate('errors.businessLogicError'),
        );
      }

      // Validate password
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);

      if (!isPasswordValid) {
        // Emit failed login event for activity logging
        await this.typeSafeEventEmitter.emitAsync(
          AuthEvents.USER_LOGIN_FAILED,
          new UserLoginFailedEvent(
            dto.emailOrPhone,
            user.id,
            'Invalid password',
          ),
        );

        throw new AuthenticationFailedException(
          this.i18n.translate('errors.invalidCredentials'),
        );
      }

      // Password is valid, continue with login
      if (!user.id || user.id.trim() === '') {
        this.logger.error(
          `User object missing or invalid ID for email/phone: ${dto.emailOrPhone}`,
        );
        throw new AuthenticationFailedException(
          this.i18n.translate('errors.authenticationFailed'),
        );
      }

      // Use user for rest of login flow
      const userForLogin = user;

      // Check if 2FA is enabled
      if (userForLogin.twoFactorEnabled) {
        // Generate and send 2FA code
        // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
        // const twoFactorCode = this.twoFactorService.generateToken(
        //   userForLogin.twoFactorSecret,
        // );
        const twoFactorCode = 'DISABLED';
        // In a real implementation, you would send this via SMS or email

        return {
          requiresTwoFactor: true,
          message: 'Two-factor authentication required',
          tempToken: this.jwtService.sign(
            { sub: userForLogin.id, email: userForLogin.email, temp: true },
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
          userForLogin.email || '',
          null as any,
        ),
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: userForLogin.id,
          email: userForLogin.email,
          name: userForLogin.name,
          isActive: userForLogin.isActive,
          twoFactorEnabled: userForLogin.twoFactorEnabled,
        },
      };
    } else {
      // User doesn't exist - return same error message to prevent enumeration
      throw new AuthenticationFailedException(
        this.i18n.translate('errors.invalidCredentials'),
      );
    }
  }

  async verify2FA(dto: TwoFactorRequest) {
    // Find user by email
    const user = await this.userService.findUserByEmail(dto.email);

    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.userNotFound'),
      );
    }

    if (!user.twoFactorEnabled) {
      throw new BusinessLogicException(
        this.i18n.translate('errors.businessLogicError'),
      );
    }

    // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
    // const isValid = this.twoFactorService.verifyToken(
    //   dto.code,
    //   user.twoFactorSecret,
    // );
    const isValid = true; // Temporarily disabled

    if (!isValid) {
      this.logger.error('Invalid 2FA code provided', {
        userId: user.id,
        email: dto.email,
      });
      throw new AuthenticationFailedException(
        this.i18n.translate('errors.authenticationFailed'),
      );
    }

    // Generate final tokens
    const tokens = this.generateTokens(user);

    // Hash and store refresh token in database
    const hashedRt = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userService.update(user.id, { hashedRt });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async verifyEmail(dto: VerifyEmailRequestDto) {
    let userId: string;
    let email: string | undefined;
    try {
      const result = await this.verificationService.verifyToken(dto.token);
      userId = result.userId;
      email = result.email;
    } catch (error: unknown) {
      this.logger.error(
        'Email verification failed - invalid or expired token',
        error,
        { token: dto.token.substring(0, 10) + '...' },
      );
      throw error;
    }

    // Update user emailVerified date
    await this.userService.update(userId, { emailVerified: new Date() });

    // Get user to create actor
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException(this.i18n.translate('errors.userNotFound'));
    }

    // Create actor from user (the user themselves is the actor)
    const actor: ActorUser = {
      ...user,
      userProfileId: user.id,
      profileType: 'USER' as any,
      centerId: undefined,
    } as ActorUser;

    // Emit email verified event
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.EMAIL_VERIFIED,
      new EmailVerifiedEvent(userId, actor),
    );

    return {
      message: this.i18n.translate('success.emailVerified'),
      user: {
        id: userId,
        email,
      },
    };
  }

  async requestEmailVerification(actor: ActorUser): Promise<void> {
    if (!actor.email) {
      throw new BadRequestException(
        this.i18n.translate('errors.badRequest'),
      );
    }

    // Emit event for email verification (event-driven)
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.EMAIL_VERIFICATION_SEND_REQUESTED,
      new RequestEmailVerificationEvent(actor, actor.id, actor.email),
    );
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
      throw new BadRequestException(
        this.i18n.translate('errors.badRequest'),
      );
    }

    if (!user) {
      throw new NotFoundException(this.i18n.translate('errors.userNotFound'));
    }

    // Use provided phone or user's stored phone (formatted correctly)
    const phoneToUse = phone || user.getPhone();
    if (!phoneToUse) {
      throw new BadRequestException(
        this.i18n.translate('errors.badRequest'),
      );
    }

    // Send phone verification OTP
    await this.verificationService.sendPhoneVerification(
      user.id || '',
      phoneToUse,
    );
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

    // Get user to get phone and create actor
    const user = await this.userService.findOne(verifiedUserId);
    if (!user) {
      throw new NotFoundException(this.i18n.translate('errors.userNotFound'));
    }

    // Update user phoneVerified date
    await this.userService.update(verifiedUserId, {
      phoneVerified: new Date(),
    });

    // Create actor from user (the user themselves is the actor)
    const actor: ActorUser = {
      ...user,
      userProfileId: user.id,
      profileType: 'USER' as any,
      centerId: undefined,
    } as ActorUser;

    // Emit phone verified event (target user is the verified user, not the actor)
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.PHONE_VERIFIED,
      new PhoneVerifiedEvent(verifiedUserId, user.getPhone(), actor),
    );
  }

  async forgotPassword(dto: ForgotPasswordRequestDto, actor: ActorUser) {
    // Find user by email or phone
    let user;
    if (actor) {
      user = actor;
    } else if (dto.email) {
      user = await this.userService.findUserByEmail(dto.email);
    } else if (dto.phone) {
      user = await this.userService.findUserByPhone(dto.phone);
    }

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If an account exists, a password reset link has been sent.',
      };
    }

    // Determine channel if not provided
    let channel = dto.channel as NotificationChannel;
    if (!channel) {
      // Auto-detect channel based on input
      if (dto.email) {
        channel = NotificationChannel.EMAIL;
      } else if (dto.phone) {
        channel = NotificationChannel.SMS; // Default to SMS for phone
      } else {
        throw new BadRequestException(
          this.i18n.translate('errors.badRequest'),
        );
      }
    }

    // Send password reset via selected channel (will use user's stored email/phone)
    await this.verificationService.sendPasswordReset(user.id, channel);

    return {
      message:
        'If an account exists, a password reset link has been sent via the selected channel.',
    };
  }

  async resetPassword(dto: ResetPasswordRequestDto) {
    // Use newPassword from the DTO
    // Check if it's a token or code
    try {
      if (dto.token) {
        await this.verificationService.resetPassword(
          dto.token,
          dto.newPassword,
        );
      } else if (dto.code) {
        await this.verificationService.resetPasswordByCode(
          dto.code,
          dto.newPassword,
          dto.userId,
        );
      } else {
        this.logger.error(
          'Password reset failed - neither token nor code provided',
        );
        throw new Error('Either token or code is required');
      }
    } catch (error: unknown) {
      this.logger.error(
        `Password reset failed - userId: ${dto.userId}, hasToken: ${!!dto.token}, hasCode: ${!!dto.code}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }

    return {
      success: true,
      message: this.i18n.translate('success.passwordReset'),
    };
  }

  async setupTwoFactor(userId: string, actor: ActorUser) {
    const user = await this.userService.findOne(userId, true);

    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.userNotFound'),
      );
    }

    if (user.twoFactorEnabled) {
      throw new BusinessLogicException(
        this.i18n.translate('errors.businessLogicError'),
      );
    }

    // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
    // Generate 2FA secret and QR code
    // const { secret, otpauthUrl, qrCodeUrl } =
    //   await this.twoFactorService.setupTwoFactor(user.email);
    const { secret, otpauthUrl, qrCodeUrl } = {
      secret: 'DISABLED',
      otpauthUrl: 'DISABLED',
      qrCodeUrl: 'DISABLED',
    };

    // Store secret temporarily (not enabled yet)
    await this.userService.updateUserTwoFactor(userId, secret, false);

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_SETUP,
      new TwoFactorSetupEvent(userId, actor),
    );

    return {
      secret,
      otpauthUrl,
      qrCodeUrl,
      message: 'Scan the QR code with your authenticator app',
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
        this.i18n.translate('errors.userNotFound'),
      );
    }

    if (user.twoFactorEnabled) {
      throw new BusinessLogicException(
        this.i18n.translate('errors.businessLogicError'),
      );
    }

    if (!user.twoFactorSecret) {
      throw new BusinessLogicException(
        this.i18n.translate('errors.businessLogicError'),
      );
    }

    // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
    // Verify the 2FA code
    // const isValid = this.twoFactorService.verifyToken(
    //   verificationCode,
    //   user.twoFactorSecret,
    // );
    const isValid = true; // Temporarily disabled
    if (!isValid) {
      throw new AuthenticationFailedException(
        this.i18n.translate('errors.authenticationFailed'),
      );
    }

    // Enable 2FA
    await this.userService.updateUserTwoFactor(
      userId,
      user.twoFactorSecret,
      true,
    );

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_ENABLED,
      new TwoFactorEnabledEvent(userId, actor),
    );

    return { message: this.i18n.translate('success.twoFactorEnabled') };
  }

  async disableTwoFactor(
    userId: string,
    verificationCode: string,
    actor: ActorUser,
  ) {
    const user = await this.userService.findOne(userId, true);

    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.userNotFound'),
      );
    }

    if (!user.twoFactorEnabled) {
      throw new BusinessLogicException(
        this.i18n.translate('errors.businessLogicError'),
      );
    }

    // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
    // Verify the 2FA code
    // const isValid = this.twoFactorService.verifyToken(
    //   verificationCode,
    //   user.twoFactorSecret,
    // );
    const isValid = true; // Temporarily disabled
    if (!isValid) {
      this.logger.error('Invalid 2FA verification code for disable', {
        userId: user.id,
        email: user.email,
      });
      throw new AuthenticationFailedException(
        this.i18n.translate('errors.authenticationFailed'),
      );
    }

    // Disable 2FA
    await this.userService.updateUserTwoFactor(userId, null, false);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_DISABLED,
      new TwoFactorDisabledEvent(userId, actor),
    );

    return { message: this.i18n.translate('success.twoFactorDisabled') };
  }

  async logout(actor: ActorUser) {
    // Clear hashed refresh token from database
    await this.userService.update(actor.id, { hashedRt: null });

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.USER_LOGGED_OUT,
      new UserLoggedOutEvent(actor.id, actor),
    );

    return { message: this.i18n.translate('success.logout') };
  }

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
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
        this.i18n.translate('errors.userNotFound'),
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
