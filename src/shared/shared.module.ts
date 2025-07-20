import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PaginationUtils } from './utils/pagination.utils';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule, MailModule],
  providers: [PrismaService, PaginationUtils],
  exports: [
    PrismaService,
    PaginationUtils,
    MailModule, // Export the entire MailModule to make MailerService available
  ],
})
export class SharedModule {}
