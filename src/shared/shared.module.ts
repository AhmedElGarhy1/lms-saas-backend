import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { MailerService } from './mailer.service';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: config.get<string>('EMAIL_USER')!,
            pass: config.get<string>('EMAIL_PASS')!,
          },
          tls: {
            rejectUnauthorized: false,
          },
          preview: config.get('NODE_ENV') !== 'test' ? true : false,
        },
        defaults: {
          from: `"LMS SaaS" <${config.get<string>('EMAIL_USER')!}>`,
        },
      }),
    }),
  ],
  providers: [PrismaService, MailerService],
  exports: [PrismaService, MailerService],
})
export class SharedModule {}
