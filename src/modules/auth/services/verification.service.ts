import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { DomainException, DomainErrors } from '@/shared/common/exceptions/domain.exception';
import { AuthErrorCode } from '../enums/auth.codes';
import { AuthErrors } from '../exceptions/auth.errors';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';
import { BaseService } from '@/shared/common/services/base.service';
import { Config } from '@/shared/config/config';
import { UserService } from '../../user/services/user.service';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { OtpEvent } from '../events/auth.events';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { VerificationType } from '../enums/verification-type.enum';
import { VerificationToken } from '../entities/verification-token.entity';
import { Transactional, Propagation } from '@nestjs-cls/transactional';

export interface CreateVerificationTokenData {
  userId: string;
  type: VerificationType;
  code?: string;
  expiresAt?: Date;
}

@Injectable()
export class VerificationService extends BaseService {
  private readonly logger: Logger = new Logger(VerificationService.name);

  constructor(
    private readonly verificationTokenRepository: VerificationTokenRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  /**
   * Generate a random OTP code (6 digits)
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get default expiration time for password reset
   */
  private getPasswordResetExpiration(): Date {
    const expirationHours = Config.auth.passwordResetExpiresHours;
    return new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }

  /**
   * Get default expiration time for OTP codes (used for phone verification, user import, etc.)
   */
  private getDefaultOtpExpiration(): Date {
    const expirationMinutes = Config.auth.phoneVerificationExpiresMinutes;
    return new Date(Date.now() + expirationMinutes * 60 * 1000);
  }

  /**
   * Create a verification token
   */
  async createVerificationToken(
    data: CreateVerificationTokenData,
  ): Promise<VerificationToken> {
    const code = data.code || this.generateOTPCode();
    let expiresAt = data.expiresAt;

    if (!expiresAt) {
      switch (data.type) {
        case VerificationType.PASSWORD_RESET:
          expiresAt = this.getPasswordResetExpiration();
          break;
        case VerificationType.OTP_VERIFICATION:
        case VerificationType.TWO_FACTOR_AUTH:
        case VerificationType.LOGIN_OTP:
        case VerificationType.IMPORT_USER_OTP:
          expiresAt = this.getDefaultOtpExpiration();
          break;
        default:
          expiresAt = this.getDefaultOtpExpiration();
      }
    }

    // Delete any existing verification tokens of the same type for this user
    await this.verificationTokenRepository.deleteByUserIdAndType(
      data.userId,
      data.type,
    );

    const verificationToken =
      await this.verificationTokenRepository.createVerificationToken({
        userId: data.userId,
        type: data.type,
        code,
        expiresAt,
      });

    return verificationToken;
  }

  /**
   * Find verification token by code
   */
  async findByCode(
    code: string,
    type: VerificationType,
    userId?: string,
  ): Promise<VerificationToken> {
    const verificationToken = await this.verificationTokenRepository.findByCode(
      code,
      type,
      userId,
    );

    if (!verificationToken) {
      throw AuthErrors.otpInvalid();
    }

    if (verificationToken.expiresAt < new Date()) {
      await this.verificationTokenRepository.deleteById(verificationToken.id);
      throw AuthErrors.otpExpired();
    }

    return verificationToken;
  }

  /**
   * Verify code and return user ID
   */
  async verifyCode(
    code: string,
    type: VerificationType,
    userId?: string,
  ): Promise<{ userId: string }> {
    const verificationToken = await this.findByCode(code, type, userId);

    // Mark as verified
    await this.verificationTokenRepository.markAsVerified(verificationToken.id);

    // Delete token after verification
    await this.verificationTokenRepository.deleteById(verificationToken.id);

    return {
      userId: verificationToken.userId,
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
      await this.verificationTokenRepository.findByUserIdAndType(
        data.userId,
        data.type,
      );

    // If token exists and is not expired and not verified, reuse it
    if (
      existingToken &&
      existingToken.expiresAt > new Date() &&
      !existingToken.verifiedAt
    ) {
      return existingToken;
    }

    // If token doesn't exist, is expired, or already verified, create a new one
    // Delete any existing tokens of the same type for this user first
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
   * Notification system will fetch user and phone
   */
  async sendPhoneVerification(userId: string): Promise<void> {
    // Get or create verification token (reuses existing non-expired token)
    const verificationToken = await this.getOrCreateVerificationToken({
      userId,
      type: VerificationType.OTP_VERIFICATION,
    });

    const expiresInMinutes = Config.auth.phoneVerificationExpiresMinutes;

    // Calculate remaining minutes for existing token
    const now = new Date();
    const expiresAt = verificationToken.expiresAt;
    const remainingMinutes = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)),
    );

    // Emit OTP event (notification system will fetch user and phone)
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.OTP,
      new OtpEvent(
        userId,
        verificationToken.code,
        remainingMinutes || expiresInMinutes,
      ),
    );
  }

  /**
   * Send 2FA OTP via SMS (for setup/enable/disable)
   * Reuses existing non-expired token if available
   * Notification system will fetch user and phone
   */
  @Transactional(Propagation.RequiresNew)
  async sendTwoFactorOTP(userId: string): Promise<void> {
    // Get or create verification token (reuses existing non-expired token)
    const verificationToken = await this.getOrCreateVerificationToken({
      userId,
      type: VerificationType.TWO_FACTOR_AUTH,
    });

    const expiresInMinutes = Config.auth.phoneVerificationExpiresMinutes;

    // Calculate remaining minutes for existing token
    const now = new Date();
    const expiresAt = verificationToken.expiresAt;
    const remainingMinutes = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)),
    );

    // Emit OTP event (notification system will fetch user and phone)
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.OTP,
      new OtpEvent(
        userId,
        verificationToken.code,
        remainingMinutes || expiresInMinutes,
      ),
    );
  }

  /**
   * Send login OTP via SMS (for login with 2FA)
   * Reuses existing non-expired token if available
   * Notification system will fetch user and phone
   * Uses REQUIRES_NEW propagation to ensure token is committed
   * even if the calling transaction rolls back
   */
  @Transactional(Propagation.RequiresNew)
  async sendLoginOTP(userId: string): Promise<void> {
    // Get or create verification token (reuses existing non-expired token)
    const verificationToken = await this.getOrCreateVerificationToken({
      userId,
      type: VerificationType.LOGIN_OTP,
    });

    const expiresInMinutes = Config.auth.phoneVerificationExpiresMinutes;

    // Calculate remaining minutes for existing token
    const now = new Date();
    const expiresAt = verificationToken.expiresAt;
    const remainingMinutes = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)),
    );

    // Emit OTP event (notification system will fetch user and phone)
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.OTP,
      new OtpEvent(
        userId,
        verificationToken.code,
        remainingMinutes || expiresInMinutes,
      ),
    );
  }

  /**
   * Send password reset OTP
   * Reuses existing non-expired token if available
   * Notification system will fetch user and phone
   */
  async sendPasswordReset(userId: string): Promise<void> {
    // Get or create verification token (reuses existing non-expired token)
    const verificationToken = await this.getOrCreateVerificationToken({
      userId,
      type: VerificationType.PASSWORD_RESET,
    });

    // Calculate remaining time for existing token
    const now = new Date();
    const expiresAt = verificationToken.expiresAt;
    const remainingHours = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
    );

    // Emit OTP event (notification system will fetch user and phone)
    const expiresInMinutes =
      remainingHours > 0
        ? remainingHours * 60
        : Config.auth.passwordResetExpiresHours * 60;
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.OTP,
      new OtpEvent(userId, verificationToken.code, expiresInMinutes),
    );
  }

  /**
   * Reset password using code
   */
  @Transactional()
  async resetPassword(
    code: string,
    newPassword: string,
    userId?: string,
  ): Promise<void> {
    const verificationToken = await this.findByCode(
      code,
      VerificationType.PASSWORD_RESET,
      userId,
    );

    // Update user password (entity hook will hash it automatically)
    await this.userService.update(verificationToken.userId, {
      password: newPassword,
    });

    // Delete the reset token
    await this.verificationTokenRepository.deleteById(verificationToken.id);
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.verificationTokenRepository.deleteExpiredTokens();
  }
}
