import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { EmailNotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { TimeoutConfigService } from '../config/timeout.config';
import pTimeout from 'p-timeout';
import { Config } from '@/shared/config/config';

@Injectable()
export class EmailAdapter
  implements NotificationAdapter<EmailNotificationPayload>
{
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly logger: LoggerService,
    private readonly timeoutConfig: TimeoutConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: Config.email.host,
      port: Config.email.port,
      secure: true,
      auth: {
        user: Config.email.user,
        pass: Config.email.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    }) as nodemailer.Transporter;
  }

  async send(payload: EmailNotificationPayload): Promise<void> {
    // Type system ensures channel is EMAIL, no runtime check needed
    // Wrap SMTP send with timeout guard
    const timeoutMs = this.timeoutConfig.getTimeout(NotificationChannel.EMAIL);
    await pTimeout(
      this.transporter.sendMail({
        from: `"LMS SaaS" <${Config.email.user}>`,
        to: payload.recipient,
        subject: payload.subject,
        html: payload.data.html || payload.data.content || '',
      }),
      {
        milliseconds: timeoutMs,
        message: `Email send timeout after ${timeoutMs}ms`,
      },
    );
  }

  // Legacy method for backward compatibility during migration
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"LMS SaaS" <${Config.email.user}>`,
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
    const resetUrl = `${Config.app.frontendUrl}/reset-password?token=${resetToken}`;

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
