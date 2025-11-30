import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { ExportService } from './common/services/export.service';
import { BulkOperationService } from './common/services/bulk-operation.service';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';
import { RedisModule } from './modules/redis/redis.module';
import { TypeSafeEventEmitter } from './services/type-safe-event-emitter.service';
import { TranslationService } from './common/services/translation.service';

@Global()
@Module({
  imports: [ConfigModule, ActivityLogModule, RedisModule, EventEmitterModule],
  controllers: [],
  providers: [
    DatabaseService,
    ExportService,
    BulkOperationService,
    TypeOrmExceptionFilter,
    TypeSafeEventEmitter,
    TranslationService,
  ],
  exports: [
    DatabaseService,
    ExportService,
    BulkOperationService,
    ActivityLogModule,
    ConfigModule,
    RedisModule,
    TypeSafeEventEmitter,
    TranslationService,
  ],
})
export class SharedModule {}
