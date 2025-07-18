import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [ConfigModule, MailModule, SharedModule],
  providers: [PrismaService],
  exports: [PrismaService, MailModule, ConfigModule, SharedModule],
})
export class SharedModule {}
