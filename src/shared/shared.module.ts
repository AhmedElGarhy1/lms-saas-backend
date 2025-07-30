import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './services/logger.service';
import { MailerService } from './services/mailer.service';
import { DatabaseService } from './database.service';
import { HealthController } from './controllers/health.controller';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { HealthService } from './services/health.service';

@Global()
@Module({
  imports: [ConfigModule, ActivityLogModule],
  controllers: [HealthController],
  providers: [LoggerService, MailerService, DatabaseService, HealthService],
  exports: [
    LoggerService,
    MailerService,
    DatabaseService,
    ActivityLogModule,
    ConfigModule,
  ],
})
export class SharedModule {}
