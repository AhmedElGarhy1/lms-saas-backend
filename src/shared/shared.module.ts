import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerService } from './services/logger.service';
import { DatabaseService } from './database.service';
import { ExportService } from './common/services/export.service';
import { HealthController } from './controllers/health.controller';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { HealthService } from './services/health.service';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';
import { RedisModule } from './modules/redis/redis.module';
import { TypeSafeEventEmitter } from './services/type-safe-event-emitter.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    WinstonModule,
    ActivityLogModule,
    RedisModule,
    EventEmitterModule,
  ],
  controllers: [HealthController],
  providers: [
    LoggerService,
    DatabaseService,
    ExportService,
    HealthService,
    TypeOrmExceptionFilter,
    TypeSafeEventEmitter,
  ],
  exports: [
    LoggerService,
    DatabaseService,
    ExportService,
    ActivityLogModule,
    ConfigModule,
    RedisModule,
    TypeSafeEventEmitter,
  ],
})
export class SharedModule {}
