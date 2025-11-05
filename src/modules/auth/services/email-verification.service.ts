import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { ConfigService } from '@nestjs/config';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { EmailVerificationRequestedEvent } from '../events/auth.events';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import * as crypto from 'crypto';

export interface CreateEmailVerificationData {
  userId: string;
  email: string;
  token?: string;
  expiresAt?: Date;
}

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  async createEmailVerification(data: CreateEmailVerificationData) {
    const token = data.token || this.generateVerificationToken();
    const expiresAt = data.expiresAt || this.getDefaultExpiration();

    const verification =
      await this.emailVerificationRepository.createEmailVerification({
        userId: data.userId,
        token,
        expiresAt,
      });

    this.logger.log(
      `Email verification created for user: ${data.userId}`,
      'EmailVerificationService',
      {
        userId: data.userId,
        email: data.email,
        expiresAt,
      },
    );

    return verification;
  }

  async findEmailVerification(token: string) {
    const verification =
      await this.emailVerificationRepository.findEmailVerification(token);

    if (!verification) {
      throw new NotFoundException('Email verification token not found');
    }

    if (verification.expiresAt < new Date()) {
      await this.deleteEmailVerification(token);
      throw new BadRequestException('Email verification token has expired');
    }

    return verification;
  }

  async deleteEmailVerification(token: string): Promise<void> {
    await this.emailVerificationRepository.deleteEmailVerification(token);

    this.logger.log(
      `Email verification deleted for token: ${token}`,
      'EmailVerificationService',
    );
  }

  async verifyEmail(token: string): Promise<{ userId: string; email: string }> {
    const verification = await this.findEmailVerification(token);

    // Mark email as verified (this would typically update the user entity)
    await this.deleteEmailVerification(token);

    this.logger.log(
      `Email verified for user: ${verification.userId}`,
      'EmailVerificationService',
      {
        userId: verification.userId,
        email: verification.user?.email || 'unknown',
      },
    );

    return {
      userId: verification.userId,
      email: verification.user?.email || 'unknown',
    };
  }

  async sendVerificationEmail(
    userId: string,
    email: string,
    name?: string,
  ): Promise<void> {
    const verification = await this.createEmailVerification({ userId, email });

    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${verification.token}`;
    const expiresIn = this.configService.get<string>(
      'EMAIL_VERIFICATION_EXPIRES_HOURS',
      '24',
    );

    // Emit event for notification system
    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.EMAIL_VERIFICATION_REQUESTED,
      new EmailVerificationRequestedEvent(
        userId,
        email,
        verification.token,
        verificationUrl,
        name,
      ),
    );

    this.logger.log(
      `Email verification event emitted to: ${email}`,
      'EmailVerificationService',
      {
        userId,
        email,
      },
    );
  }

  async resendVerificationEmail(
    userId: string,
    email: string,
    name?: string,
  ): Promise<void> {
    // Delete any existing verification tokens for this user
    await this.emailVerificationRepository.deleteExpiredVerifications();

    // Create new verification
    await this.sendVerificationEmail(userId, email, name);
  }

  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getDefaultExpiration(): Date {
    const expirationHours = this.configService.get(
      'EMAIL_VERIFICATION_EXPIRES_HOURS',
      '24',
    );
    return new Date(Date.now() + parseInt(expirationHours) * 60 * 60 * 1000);
  }
}
