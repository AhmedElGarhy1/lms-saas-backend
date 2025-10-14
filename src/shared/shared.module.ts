import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from './services/logger.service';
import { MailerService } from './services/mailer.service';
import { DatabaseService } from './database.service';
import { ExportService } from './common/services/export.service';
import { HealthController } from './controllers/health.controller';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { HealthService } from './services/health.service';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';

@Global()
@Module({
  imports: [ConfigModule, WinstonModule, ActivityLogModule],
  controllers: [HealthController],
  providers: [
    LoggerService,
    MailerService,
    DatabaseService,
    ExportService,
    HealthService,
    TypeOrmExceptionFilter,
  ],
  exports: [
    LoggerService,
    MailerService,
    DatabaseService,
    ExportService,
    ActivityLogModule,
    ConfigModule,
  ],
})
export class SharedModule {}
