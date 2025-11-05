import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { PasswordResetRequestedEvent } from '../events/auth.events';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Transactional } from '@nestjs-cls/transactional';

export interface CreatePasswordResetData {
  userId: string;
  email: string;
  token?: string;
  expiresAt?: Date;
}

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  async createPasswordResetToken(data: CreatePasswordResetData) {
    const token = data.token || this.generateResetToken();
    const expiresAt = data.expiresAt || this.getDefaultExpiration();

    const resetToken =
      await this.passwordResetRepository.createPasswordResetToken({
        userId: data.userId,
        token,
        expiresAt,
      });

    this.logger.log(
      `Password reset token created for user: ${data.userId}`,
      'PasswordResetService',
      {
        userId: data.userId,
        email: data.email,
        expiresAt,
      },
    );

    return resetToken;
  }

  async findPasswordResetToken(token: string) {
    const resetToken =
      await this.passwordResetRepository.findPasswordResetToken(token);

    if (!resetToken) {
      throw new NotFoundException('Password reset token not found');
    }

    if (resetToken.expiresAt < new Date()) {
      await this.deletePasswordResetToken(token);
      throw new BadRequestException('Password reset token has expired');
    }

    return resetToken;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await this.passwordResetRepository.deletePasswordResetToken(token);

    this.logger.log(
      `Password reset token deleted: ${token}`,
      'PasswordResetService',
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.findPasswordResetToken(token);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await this.userService.update(resetToken.userId, {
      password: hashedPassword,
    });

    // Delete the reset token
    await this.deletePasswordResetToken(token);

    this.logger.log(
      `Password reset completed for user: ${resetToken.userId}`,
      'PasswordResetService',
      {
        userId: resetToken.userId,
        email: resetToken.user?.email || 'unknown',
      },
    );
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await this.userService.findUserByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not for security
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
        'PasswordResetService',
      );
      return;
    }

    const resetToken = await this.createPasswordResetToken({
      userId: user.id,
      email: user.email || '',
    });

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken.token}`;
    const expiresIn = this.configService.get<string>(
      'PASSWORD_RESET_EXPIRES_HOURS',
      '1',
    );

    // Emit event for notification system
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.PASSWORD_RESET_REQUESTED,
      new PasswordResetRequestedEvent(
        null as any,
        email,
        user.id,
        user.name,
        resetToken.token,
        resetUrl,
      ),
    );

    this.logger.log(
      `Password reset event emitted for: ${email}`,
      'PasswordResetService',
      {
        userId: user.id,
        email,
      },
    );
  }

  async validateResetToken(
    token: string,
  ): Promise<{ userId: string; email: string }> {
    const resetToken = await this.findPasswordResetToken(token);

    return {
      userId: resetToken.userId,
      email: resetToken.user?.email || 'unknown',
    };
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.passwordResetRepository.deleteExpiredTokens();

    this.logger.log(
      `Cleaned up expired password reset tokens`,
      'PasswordResetService',
    );
  }

  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getDefaultExpiration(): Date {
    const expirationHours = this.configService.get(
      'PASSWORD_RESET_EXPIRES_HOURS',
      '1',
    );
    return new Date(Date.now() + parseInt(expirationHours) * 60 * 60 * 1000);
  }
}
