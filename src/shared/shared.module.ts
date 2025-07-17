import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [ConfigModule, MailModule],
  providers: [PrismaService],
  exports: [PrismaService, MailModule, ConfigModule],
})
export class SharedModule {}
