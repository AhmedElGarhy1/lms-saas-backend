import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { ExportService } from './common/services/export.service';
import { BulkOperationService } from './common/services/bulk-operation.service';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { RedisModule } from './modules/redis/redis.module';
import { TypeSafeEventEmitter } from './services/type-safe-event-emitter.service';
import { CacheKeyBuilderService } from './common/services/cache-key-builder.service';
import { SelfProtectionService } from './common/services/self-protection.service';
import { RoleHierarchyService } from './common/services/role-hierarchy.service';
import { FileModule } from '@/modules/file/file.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    ActivityLogModule,
    RedisModule,
    EventEmitterModule,
    FileModule,
    AccessControlModule,
  ],
  controllers: [],
  providers: [
    DatabaseService,
    ExportService,
    BulkOperationService,
    TypeSafeEventEmitter,
    CacheKeyBuilderService,
    EventEmitterModule,
    SelfProtectionService,
    RoleHierarchyService,
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
    SelfProtectionService,
    RoleHierarchyService,
    EventEmitterModule,
    FileModule,
    AccessControlModule,
  ],
})
export class SharedModule {}
