import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import { MailerService } from '../../../shared/services/mailer.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Transactional } from '@nestjs-cls/transactional';

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
    private readonly mailerService: MailerService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
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

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const verification = await this.createEmailVerification({ userId, email });

    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verification.token}`;

    const html = `
      <h2>Email Verification</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>Best regards,<br>LMS Team</p>
    `;

    await this.mailerService.sendMail(
      email,
      'Verify Your Email Address - LMS',
      html,
    );

    this.logger.log(
      `Verification email sent to: ${email}`,
      'EmailVerificationService',
      {
        userId,
        email,
      },
    );
  }

  async resendVerificationEmail(userId: string, email: string): Promise<void> {
    // Delete any existing verification tokens for this user
    await this.emailVerificationRepository.deleteExpiredVerifications();

    // Create new verification
    await this.sendVerificationEmail(userId, email);
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
