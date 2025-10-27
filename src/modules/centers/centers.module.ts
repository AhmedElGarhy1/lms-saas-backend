import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentersService } from './services/centers.service';
import { BranchesService } from './services/branches.service';
import { Center } from './entities/center.entity';
import { Branch } from './entities/branch.entity';
import { CentersRepository } from './repositories/centers.repository';
import { BranchesRepository } from './repositories/branches.repository';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { UserModule } from '@/modules/user/user.module';
import { CentersController } from './controllers/centers.controller';
import { BranchesController } from './controllers/branches.controller';
import { CentersActionsController } from './controllers/centers-actions.controller';
import { BranchesActionsController } from './controllers/branches-actions.controller';
import { CentersAccessController } from './controllers/centers-access.controller';
import { BranchesAccessController } from './controllers/branches-access.controller';
import { ActivityLogListener } from './listeners/activity-log.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Center, Branch]),
    ActivityLogModule,
    forwardRef(() => AccessControlModule),
    forwardRef(() => UserModule),
  ],
  controllers: [
    BranchesAccessController,
    BranchesController,
    BranchesActionsController,
    CentersActionsController,
    CentersAccessController,
    CentersController,
  ],
  providers: [
    CentersService,
    BranchesService,
    CentersRepository,
    BranchesRepository,
    ActivityLogListener,
  ],
  exports: [CentersService, BranchesService],
})
export class CentersModule {}
