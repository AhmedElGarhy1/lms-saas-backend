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
// TranslationService removed - no longer needed after translation removal
import { CacheKeyBuilderService } from './common/services/cache-key-builder.service';

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
    CacheKeyBuilderService,
  ],
  exports: [
    DatabaseService,
    ExportService,
    BulkOperationService,
    ActivityLogModule,
    ConfigModule,
    RedisModule,
    TypeSafeEventEmitter,
    CacheKeyBuilderService,
  ],
})
export class SharedModule {}
