import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogController } from './controllers/activity-log.controller';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { ActivityLog } from './entities/activity-log.entity';
import { AccessControlModule } from '@/modules/access-control/access-control.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityLog]),
    forwardRef(() => AccessControlModule), // For AccessControlHelperService
  ],
  controllers: [ActivityLogController],
  providers: [ActivityLogService, ActivityLogRepository],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
