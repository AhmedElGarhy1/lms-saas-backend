import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { ExportService } from './common/services/export.service';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';
import { RedisModule } from './modules/redis/redis.module';
import { TypeSafeEventEmitter } from './services/type-safe-event-emitter.service';
import { TranslationService } from './services/translation.service';

@Global()
@Module({
  imports: [ConfigModule, ActivityLogModule, RedisModule, EventEmitterModule],
  controllers: [],
  providers: [
    DatabaseService,
    ExportService,
    TypeOrmExceptionFilter,
    TypeSafeEventEmitter,
    TranslationService,
  ],
  exports: [
    DatabaseService,
    ExportService,
    ActivityLogModule,
    ConfigModule,
    RedisModule,
    TypeSafeEventEmitter,
    TranslationService,
  ],
})
export class SharedModule {}
