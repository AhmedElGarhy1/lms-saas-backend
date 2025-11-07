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
}
