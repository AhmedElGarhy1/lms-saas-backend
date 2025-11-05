import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { EmailNotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationSendingFailedException } from '../exceptions/notification.exceptions';

@Injectable()
export class EmailAdapter implements NotificationAdapter<EmailNotificationPayload> {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('EMAIL_PORT', 465),
      secure: true,
      auth: {
        user: this.config.get<string>('EMAIL_USER'),
        pass: this.config.get<string>('EMAIL_PASS'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    }) as nodemailer.Transporter;
  }

  async send(payload: EmailNotificationPayload): Promise<void> {
    // Type system ensures channel is EMAIL, no runtime check needed
    await this.transporter.sendMail({
      from: `"LMS SaaS" <${this.config.get<string>('EMAIL_USER')}>`,
      to: payload.recipient,
      subject: payload.subject,
      html: payload.data.html || payload.data.content || '',
    });
  }

  // Legacy method for backward compatibility during migration
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"LMS SaaS" <${this.config.get<string>('EMAIL_USER')}>`,
      to,
      subject,
      html,
    });
  }

  async sendPasswordReset(
    email: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;

    const html = `
      <h2>Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>You have requested to reset your password. Click the link below to proceed:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
      <p>Best regards,<br>LMS Team</p>
    `;

    await this.sendMail(email, 'Password Reset Request - LMS', html);
  }
}
