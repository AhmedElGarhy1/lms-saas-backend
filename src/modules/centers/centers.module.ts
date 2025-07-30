import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { CentersController } from './controllers/centers.controller';
import { CentersService } from './services/centers.service';
import { CenterEventsService } from './services/center-events.service';
import { Center } from './entities/center.entity';
import { CentersRepository } from './repositories/centers.repository';

import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { CenterEventEmitter } from '@/common/events/center.events';
import {
  CenterEventEmitter as CenterEventEmitterOld,
  UserEventEmitter,
} from '@/common/events';

@Module({
  imports: [
    WinstonModule,
    TypeOrmModule.forFeature([Center]),
    ActivityLogModule,
    AccessControlModule,
  ],
  controllers: [CentersController],
  providers: [
    CentersService,
    CenterEventsService,
    CentersRepository,
    {
      provide: CenterEventEmitter,
      useClass: CenterEventEmitter,
    },
    {
      provide: CenterEventEmitterOld,
      useClass: CenterEventEmitterOld,
    },
    {
      provide: UserEventEmitter,
      useClass: UserEventEmitter,
    },
  ],
  exports: [CentersService, CenterEventsService],
})
export class CentersModule {}
