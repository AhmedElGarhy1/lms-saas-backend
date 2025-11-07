import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { Config } from '@/shared/config/config';
import { UserService } from '../../user/services/user.service';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import {
  PasswordResetRequestedEvent,
  EmailVerificationRequestedEvent,
  OtpEvent,
} from '../events/auth.events';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { VerificationType } from '../enums/verification-type.enum';
import { NotificationChannel } from '../../notifications/enums/notification-channel.enum';
import { VerificationToken } from '../entities/verification-token.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Transactional } from '@nestjs-cls/transactional';

export interface CreateVerificationTokenData {
  userId: string;
  type: VerificationType;
  channel: NotificationChannel;
  token?: string;
  code?: string;
  expiresAt?: Date;
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly verificationTokenRepository: VerificationTokenRepository,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  /**
   * Generate a random OTP code (6 digits)
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get default expiration time for email verification
   */
  private getEmailVerificationExpiration(): Date {
    const expirationHours = Config.auth.emailVerificationExpiresHours;
    return new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }

  /**
   * Get default expiration time for password reset
   */
  private getPasswordResetExpiration(): Date {
    const expirationHours = Config.auth.passwordResetExpiresHours;
    return new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }

  /**
   * Get default expiration time for phone verification (OTP)
   */
  private getPhoneVerificationExpiration(): Date {
    const expirationMinutes = Config.auth.phoneVerificationExpiresMinutes;
    return new Date(Date.now() + expirationMinutes * 60 * 1000);
  }

  /**
   * Create a verification token
   */
  async createVerificationToken(
    data: CreateVerificationTokenData,
  ): Promise<VerificationToken> {
    const token = data.token || this.generateToken();
    const code = data.code || this.generateOTPCode();
    let expiresAt = data.expiresAt;

    if (!expiresAt) {
      switch (data.type) {
        case VerificationType.EMAIL_VERIFICATION:
          expiresAt = this.getEmailVerificationExpiration();
          break;
        case VerificationType.PASSWORD_RESET:
          expiresAt = this.getPasswordResetExpiration();
          break;
        case VerificationType.PHONE_VERIFICATION:
          expiresAt = this.getPhoneVerificationExpiration();
          break;
        default:
          expiresAt = this.getEmailVerificationExpiration();
      }
    }

    // Delete any existing verification tokens of the same type and channel for this user
    await this.verificationTokenRepository.deleteByUserIdAndType(
      data.userId,
      data.type,
    );

    const verificationToken =
      await this.verificationTokenRepository.createVerificationToken({
        userId: data.userId,
        type: data.type,
        channel: data.channel,
        token,
        code: data.type === VerificationType.PHONE_VERIFICATION ? code : null,
        expiresAt,
      });

    this.logger.log(
      `Verification token created for user: ${data.userId}, type: ${data.type}, channel: ${data.channel}`,
      'VerificationService',
      {
        userId: data.userId,
        type: data.type,
        channel: data.channel,
        expiresAt,
      },
    );

    return verificationToken;
  }

  /**
   * Find verification token by token string
   */
  async findByToken(token: string): Promise<VerificationToken> {
    const verificationToken =
      await this.verificationTokenRepository.findByToken(token);

    if (!verificationToken) {
      throw new NotFoundException('Verification token not found');
    }

    if (verificationToken.expiresAt < new Date()) {
      await this.deleteToken(token);
      throw new BadRequestException('Verification token has expired');
    }

    return verificationToken;
  }

  /**
   * Find verification token by code
   */
  async findByCode(
    code: string,
    type: VerificationType,
    channel: NotificationChannel,
    userId?: string,
  ): Promise<VerificationToken> {
    const verificationToken = await this.verificationTokenRepository.findByCode(
      code,
      type,
      channel,
      userId,
    );

    if (!verificationToken) {
      throw new NotFoundException('Verification code not found');
    }

    if (verificationToken.expiresAt < new Date()) {
      await this.deleteToken(verificationToken.token);
      throw new BadRequestException('Verification code has expired');
    }

    return verificationToken;
  }

  /**
   * Verify token and return user info
   */
  async verifyToken(
    token: string,
  ): Promise<{ userId: string; email?: string; phone?: string }> {
    const verificationToken = await this.findByToken(token);

    // Mark as verified
    await this.verificationTokenRepository.markAsVerified(token);

    // Delete token after verification
    await this.deleteToken(token);

    const user = await this.userService.findOne(verificationToken.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(
      `Verification token verified for user: ${verificationToken.userId}, type: ${verificationToken.type}`,
      'VerificationService',
      {
        userId: verificationToken.userId,
        type: verificationToken.type,
      },
    );

    return {
      userId: verificationToken.userId,
      email: user.email || undefined,
      phone: user.getPhone() || undefined,
    };
  }

  /**
   * Verify code and return user info
   */
  async verifyCode(
    code: string,
    type: VerificationType,
    channel: NotificationChannel,
    userId?: string,
  ): Promise<{ userId: string; email?: string; phone?: string }> {
    const verificationToken = await this.findByCode(
      code,
      type,
      channel,
      userId,
    );

    // Mark as verified
    await this.verificationTokenRepository.markAsVerified(
      verificationToken.token,
    );

    // Delete token after verification
    await this.deleteToken(verificationToken.token);

    const user = await this.userService.findOne(verificationToken.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(
      `Verification code verified for user: ${verificationToken.userId}, type: ${type}`,
      'VerificationService',
      {
        userId: verificationToken.userId,
        type,
        channel,
      },
    );

    return {
      userId: verificationToken.userId,
      email: user.email || undefined,
      phone: user.getPhone() || undefined,
    };
  }

  /**
   * Get or create a verification token (reuses existing non-expired token if available)
   * @param data - Token creation data
   * @returns Existing non-expired token or newly created token
   */
  async getOrCreateVerificationToken(
    data: CreateVerificationTokenData,
  ): Promise<VerificationToken> {
    // Check for existing non-expired token
    const existingToken =
      await this.verificationTokenRepository.findByUserIdTypeAndChannel(
        data.userId,
        data.type,
        data.channel,
      );

    // If token exists and is not expired and not verified, reuse it
    if (
      existingToken &&
      existingToken.expiresAt > new Date() &&
      !existingToken.verifiedAt
    ) {
      this.logger.log(
        `Reusing existing non-expired verification token for user: ${data.userId}, type: ${data.type}`,
        'VerificationService',
        {
          userId: data.userId,
          type: data.type,
          channel: data.channel,
          tokenId: existingToken.id,
          expiresAt: existingToken.expiresAt,
        },
      );
      return existingToken;
    }

    // If token doesn't exist, is expired, or already verified, create a new one
    // Delete any existing tokens of the same type and channel for this user first
    if (existingToken) {
      await this.verificationTokenRepository.deleteByUserIdAndType(
        data.userId,
        data.type,
      );
    }

    return await this.createVerificationToken(data);
  }

  /**
   * Send phone verification OTP (for user creation)
   * Reuses existing non-expired token if available
   */
  async sendPhoneVerification(userId: string, phone: string): Promise<void> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get or create verification token (reuses existing non-expired token)
    const verificationToken = await this.getOrCreateVerificationToken({
      userId,
      type: VerificationType.PHONE_VERIFICATION,
      channel: NotificationChannel.SMS,
    });

    const expiresInMinutes = Config.auth.phoneVerificationExpiresMinutes;

    // Calculate remaining minutes for existing token
    const now = new Date();
    const expiresAt = verificationToken.expiresAt;
    const remainingMinutes = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)),
    );

    // Emit OTP event for notification system
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.OTP,
      new OtpEvent(
        null as any,
        userId,
        verificationToken.code!,
        remainingMinutes || expiresInMinutes,
        undefined,
        phone,
      ),
    );

    this.logger.log(
      `Phone verification OTP sent to: ${phone}${remainingMinutes > 0 ? ` (reused existing token, expires in ${remainingMinutes} minutes)` : ''}`,
      'VerificationService',
      {
        userId,
        phone,
        tokenId: verificationToken.id,
        expiresAt: verificationToken.expiresAt,
        remainingMinutes,
      },
    );
  }

  /**
   * Send email verification
   * Reuses existing non-expired token if available
   */
  async sendEmailVerification(
    userId: string,
    email: string,
    name?: string,
  ): Promise<void> {
    // Get or create verification token (reuses existing non-expired token)
    const verificationToken = await this.getOrCreateVerificationToken({
      userId,
      type: VerificationType.EMAIL_VERIFICATION,
      channel: NotificationChannel.EMAIL,
    });

    const verificationUrl = `${Config.app.frontendUrl}/verify-email?token=${verificationToken.token}`;

    // Calculate remaining time for existing token
    const now = new Date();
    const expiresAt = verificationToken.expiresAt;
    const remainingHours = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
    );

    // Emit event for notification system
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.EMAIL_VERIFICATION_REQUESTED,
      new EmailVerificationRequestedEvent(
        null as any,
        userId,
        email,
        verificationToken.token,
        verificationUrl,
        name,
      ),
    );

    this.logger.log(
      `Email verification event emitted to: ${email}${remainingHours > 0 ? ` (reused existing token, expires in ${remainingHours} hours)` : ''}`,
      'VerificationService',
      {
        userId,
        email,
        tokenId: verificationToken.id,
        expiresAt: verificationToken.expiresAt,
        remainingHours,
      },
    );
  }

  /**
   * Send password reset via selected channel
   * Uses user's stored email or phone automatically based on channel
   * Reuses existing non-expired token if available
   */
  async sendPasswordReset(
    userId: string,
    channel: NotificationChannel,
  ): Promise<void> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine recipient based on channel - use user's stored email/phone
    let recipient: string;
    if (channel === NotificationChannel.EMAIL) {
      recipient = user.email || '';
      if (!recipient) {
        throw new BadRequestException(
          'User does not have an email address. Please use SMS or WhatsApp channel.',
        );
      }
    } else if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      recipient = user.getPhone();
      if (!recipient) {
        throw new BadRequestException(
          'User does not have a phone number. Please use EMAIL channel.',
        );
      }
    } else {
      throw new BadRequestException(`Unsupported channel for password reset`);
    }

    // Get or create verification token (reuses existing non-expired token)
    const verificationToken = await this.getOrCreateVerificationToken({
      userId,
      type: VerificationType.PASSWORD_RESET,
      channel,
    });

    const resetUrl = `${Config.app.frontendUrl}/reset-password?token=${verificationToken.token}`;

    // Calculate remaining time for existing token
    const now = new Date();
    const expiresAt = verificationToken.expiresAt;
    const remainingHours = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
    );

    if (channel === NotificationChannel.EMAIL) {
      // Emit PASSWORD_RESET_REQUESTED event for email
      await this.typeSafeEventEmitter.emitAsync(
        AuthEvents.PASSWORD_RESET_REQUESTED,
        new PasswordResetRequestedEvent(
          null as any,
          recipient,
          userId,
          user.name,
          verificationToken.token,
          resetUrl,
        ),
      );
    } else if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      // Emit OTP event for SMS/WhatsApp with code
      const expiresInMinutes =
        remainingHours > 0
          ? remainingHours * 60
          : Config.auth.passwordResetExpiresHours * 60;
      await this.typeSafeEventEmitter.emitAsync(
        AuthEvents.OTP,
        new OtpEvent(
          null as any,
          userId,
          verificationToken.code!,
          expiresInMinutes,
          undefined, // No email for SMS/WhatsApp password reset
          recipient, // Phone number for SMS/WhatsApp
        ),
      );
    }

    this.logger.log(
      `Password reset event emitted via ${channel} to: ${recipient}${remainingHours > 0 ? ` (reused existing token, expires in ${remainingHours} hours)` : ''}`,
      'VerificationService',
      {
        userId,
        channel,
        recipient,
        tokenId: verificationToken.id,
        expiresAt: verificationToken.expiresAt,
        remainingHours,
      },
    );
  }

  /**
   * Reset password using token
   */
  @Transactional()
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const verificationToken = await this.findByToken(token);

    if (verificationToken.type !== VerificationType.PASSWORD_RESET) {
      throw new BadRequestException('Invalid token type for password reset');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await this.userService.update(verificationToken.userId, {
      password: hashedPassword,
    });

    // Delete the reset token
    await this.deleteToken(token);

    this.logger.log(
      `Password reset completed for user: ${verificationToken.userId}`,
      'VerificationService',
      {
        userId: verificationToken.userId,
      },
    );
  }

  /**
   * Reset password using code
   */
  @Transactional()
  async resetPasswordByCode(
    code: string,
    newPassword: string,
    userId?: string,
  ): Promise<void> {
    const verificationToken = await this.findByCode(
      code,
      VerificationType.PASSWORD_RESET,
      NotificationChannel.SMS, // Could be SMS or WhatsApp
      userId,
    );

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await this.userService.update(verificationToken.userId, {
      password: hashedPassword,
    });

    // Delete the reset token
    await this.deleteToken(verificationToken.token);

    this.logger.log(
      `Password reset completed for user: ${verificationToken.userId} using code`,
      'VerificationService',
      {
        userId: verificationToken.userId,
      },
    );
  }

  /**
   * Delete verification token
   */
  async deleteToken(token: string): Promise<void> {
    await this.verificationTokenRepository.deleteToken(token);
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.verificationTokenRepository.deleteExpiredTokens();

    this.logger.log(
      `Cleaned up expired verification tokens`,
      'VerificationService',
    );
  }

  /**
   * Resend verification (delete old and create new)
   */
  async resendVerification(
    userId: string,
    type: VerificationType,
    channel: NotificationChannel,
    email?: string,
    phone?: string,
  ): Promise<void> {
    // Delete existing tokens of this type
    await this.verificationTokenRepository.deleteByUserIdAndType(userId, type);

    // Send new verification
    if (type === VerificationType.EMAIL_VERIFICATION) {
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      await this.sendEmailVerification(
        userId,
        email || user.email || '',
        user.name,
      );
    } else if (type === VerificationType.PASSWORD_RESET) {
      await this.sendPasswordReset(userId, channel);
    } else if (type === VerificationType.PHONE_VERIFICATION) {
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      await this.sendPhoneVerification(userId, phone || user.getPhone());
    }
  }
}
