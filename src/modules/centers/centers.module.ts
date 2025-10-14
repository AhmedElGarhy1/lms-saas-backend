import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { CentersService } from './services/centers.service';
import { Center } from './entities/center.entity';
import { CentersRepository } from './repositories/centers.repository';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { UserModule } from '@/modules/user/user.module';
import { CentersController } from './controllers/centers.controller';
import { CentersActionsController } from './controllers/centers-actions.controller';
import { CentersAccessController } from './controllers/centers-access.controller';

@Module({
  imports: [
    WinstonModule,
    TypeOrmModule.forFeature([Center]),
    ActivityLogModule,
    AccessControlModule,
    forwardRef(() => UserModule),
  ],
  controllers: [
    CentersController,
    CentersActionsController,
    CentersAccessController,
  ],
  providers: [CentersService, CentersRepository],
  exports: [CentersService],
})
export class CentersModule {}
