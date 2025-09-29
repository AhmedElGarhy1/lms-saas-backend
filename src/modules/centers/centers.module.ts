import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { CentersController } from './controllers/centers.controller';
import { CentersService } from './services/centers.service';
import { CenterEventsService } from './services/center-events.service';
import { Center } from './entities/center.entity';
import { CentersRepository } from './repositories/centers.repository';

import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [
    WinstonModule,
    TypeOrmModule.forFeature([Center]),
    ActivityLogModule,
    AccessControlModule,
    forwardRef(() => UserModule),
  ],
  controllers: [CentersController],
  providers: [CentersService, CenterEventsService, CentersRepository],
  exports: [CentersService, CenterEventsService],
})
export class CentersModule {}
