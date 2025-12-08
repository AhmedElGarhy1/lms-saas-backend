import { Injectable, Logger } from '@nestjs/common';
import {
  AuthenticationFailedException,
  ResourceNotFoundException,
  BusinessLogicException,
  OtpRequiredException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { JwtService } from '@nestjs/jwt';
import { Config } from '@/shared/config/config';
import { UserService } from '../../user/services/user.service';
import { VerificationService } from './verification.service';
import * as bcrypt from 'bcrypt';
import { LoginRequestDto } from '../dto/login.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { BaseService } from '@/shared/common/services/base.service';
import { User } from '../../user/entities/user.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
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
        throw new BusinessLogicException('t.messages.alreadyIs', {
          resource: 't.resources.user',
          state: 't.resources.inactive',
        });
      }

      // Validate password
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);

      if (!isPasswordValid) {
        // Emit failed login event for activity logging
        await this.typeSafeEventEmitter.emitAsync(
          AuthEvents.USER_LOGIN_FAILED,
          new UserLoginFailedEvent(dto.phone, user.id, 'Invalid password'),
        );

        throw new AuthenticationFailedException('t.messages.fieldInvalid', {
          field: 't.resources.credentials',
        });
      }

      // Password is valid, continue with login
      if (!user.id || user.id.trim() === '') {
        this.logger.error(
          `User object missing or invalid ID for phone: ${dto.phone}`,
        );
        throw new AuthenticationFailedException('t.messages.operationError', {
          reason: 'authentication failed',
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // If OTP code not provided, send OTP and throw exception
        if (!dto.code) {
          await this.verificationService.sendLoginOTP(user.id || '');
          throw new OtpRequiredException('t.messages.fieldRequired', {
            field: 't.resources.otpCode',
          });
        }

        // OTP code provided, verify it
        try {
          await this.verificationService.verifyCode(
            dto.code,
            VerificationType.LOGIN_OTP,
            user.id,
          );
        } catch (error: unknown) {
          this.logger.error('Invalid 2FA OTP code provided', {
            userId: user.id,
            phone: user.phone,
            error: error instanceof Error ? error.message : String(error),
          });
          throw new AuthenticationFailedException('t.messages.operationError', {
            reason: 'authentication failed',
          });
        }
      }

      // Complete login (generate tokens, store refresh token, emit event)
      return this.completeLogin(user);
    } else {
      // User doesn't exist - return same error message to prevent enumeration
      throw new AuthenticationFailedException('t.messages.fieldInvalid', {
        field: 't.resources.credentials',
      });
    }
  }

  /**
   * Resend login OTP code
   * Used when user needs to resend OTP during login with 2FA
   * Requires password validation to ensure only the real user can request resend
   */
  async resendLoginOTP(phone: string, password: string): Promise<void> {
    const user = await this.userService.findUserByPhone(phone, true);

    if (!user) {
      // Don't reveal if user exists or not for security
      return;
    }

    // Validate password to ensure only the real user can request resend
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationFailedException('t.messages.fieldInvalid', {
        field: 't.resources.credentials',
      });
    }

    if (!user.twoFactorEnabled) {
      // If 2FA is not enabled, no need to send OTP
      throw new BusinessLogicException('t.messages.twoFactorNotEnabled');
    }

    // Send login OTP
    await this.verificationService.sendLoginOTP(user.id || '');
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
      throw new ValidationFailedException('t.messages.fieldRequired', [], {
        field: 't.resources.otpCode',
      });
    }

    if (!user) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.user',
      });
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
      throw new ValidationFailedException('t.messages.fieldRequired', [], {
        field: 't.resources.otpCode',
      });
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
      message: 'Password reset successfully',
    };
  }

  async setupTwoFactor(actor: ActorUser) {
    if (actor.twoFactorEnabled) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.twoFactorAuth',
        state: 't.resources.enabled',
      });
    }

    // Send OTP for 2FA setup (notification system will fetch phone)
    await this.verificationService.sendTwoFactorOTP(actor.id);

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_SETUP,
      new TwoFactorSetupEvent(actor.id, actor),
    );

    return {
      message:
        '2FA setup OTP sent to your phone. Verify the code to enable 2FA.',
    };
  }

  async enableTwoFactor(verificationCode: string, actor: ActorUser) {
    const user = await this.userService.findOne(actor.id, true);

    if (!user) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.user',
      });
    }

    if (user.twoFactorEnabled) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.twoFactorAuth',
        state: 't.resources.enabled',
      });
    }

    // Verify the OTP code
    try {
      await this.verificationService.verifyCode(
        verificationCode,
        VerificationType.TWO_FACTOR_AUTH,
        actor.id,
      );
    } catch {
      throw new AuthenticationFailedException('t.messages.operationError', {
        reason: 'authentication failed',
      });
    }

    // Enable 2FA (no secret needed for SMS OTP)
    await this.userService.updateUserTwoFactor(actor.id, true);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_ENABLED,
      new TwoFactorEnabledEvent(actor.id, actor),
    );

    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(
    verificationCode: string | undefined,
    actor: ActorUser,
  ) {
    const user = await this.userService.findOne(actor.id, true);

    if (!user) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.user',
      });
    }

    if (!user.twoFactorEnabled) {
      throw new BusinessLogicException('t.messages.twoFactorNotEnabled');
    }

    // If OTP code not provided, send OTP and throw exception
    if (!verificationCode) {
      await this.verificationService.sendTwoFactorOTP(actor.id);
      throw new OtpRequiredException('t.messages.fieldRequired', {
        field: 't.resources.otpCode',
      });
    }

    // Verify the OTP code (code is required at this point)
    try {
      await this.verificationService.verifyCode(
        verificationCode,
        VerificationType.TWO_FACTOR_AUTH,
        actor.id,
      );
    } catch {
      this.logger.error('Invalid 2FA OTP code for disable', {
        userId: user.id,
        phone: user.phone,
      });
      throw new AuthenticationFailedException('t.messages.operationError', {
        reason: 'authentication failed',
      });
    }

    // Disable 2FA
    await this.userService.updateUserTwoFactor(actor.id, false);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.TWO_FA_DISABLED,
      new TwoFactorDisabledEvent(actor.id, actor),
    );

    return { message: 'Two-factor authentication disabled successfully' };
  }

  async logout(actor: ActorUser) {
    // Clear hashed refresh token from database
    await this.userService.update(actor.id, { hashedRt: null });

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.USER_LOGGED_OUT,
      new UserLoggedOutEvent(actor.id, actor),
    );

    return { message: 'Logged out successfully' };
  }

  /**
   * Complete login flow: generate tokens, store refresh token, emit login event
   */
  private async completeLogin(user: User) {
    // Generate tokens
    const tokens = this.generateTokens(user);

    // Hash and store refresh token in database
    const hashedRt = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userService.update(user.id, { hashedRt });

    // Emit login event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.USER_LOGGED_IN,
      new UserLoggedInEvent(user.id || '', user.phone || '', user as ActorUser),
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
      throw new AuthenticationFailedException('t.messages.operationError', {
        reason: 'authentication failed',
      });
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
