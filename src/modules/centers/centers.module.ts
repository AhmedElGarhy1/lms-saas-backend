import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentersService } from './services/centers.service';
import { BranchesService } from './services/branches.service';
import { BranchAccessService } from './services/branch-access.service';
import { Center } from './entities/center.entity';
import { Branch } from './entities/branch.entity';
import { BranchAccess } from './entities/branch-access.entity';
import { CentersRepository } from './repositories/centers.repository';
import { BranchesRepository } from './repositories/branches.repository';
import { BranchAccessRepository } from './repositories/branch-access.repository';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { UserModule } from '@/modules/user/user.module';
import { UserProfileModule } from '@/modules/user-profile/user-profile.module';
import { CentersController } from './controllers/centers.controller';
import { BranchesController } from './controllers/branches.controller';
import { CentersActionsController } from './controllers/centers-actions.controller';
import { BranchesActionsController } from './controllers/branches-actions.controller';
import { CentersAccessController } from './controllers/centers-access.controller';
import { CentersAccessActionsController } from './controllers/centers-access-actions.controller';
import { BranchesAccessController } from './controllers/branches-access.controller';
import { BranchListener } from './listeners/branch.listener';
import { CenterActivityListener } from './listeners/center-activity.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Center, Branch, BranchAccess]),
    ActivityLogModule,
    forwardRef(() => AccessControlModule),
    forwardRef(() => UserModule),
    forwardRef(() => UserProfileModule),
  ],
  controllers: [
    BranchesAccessController,
    BranchesController,
    BranchesActionsController,
    CentersActionsController,
    CentersAccessController,
    CentersAccessActionsController,
    CentersController,
  ],
  providers: [
    CentersService,
    BranchesService,
    BranchAccessService,
    CentersRepository,
    BranchesRepository,
    BranchAccessRepository,
    BranchListener,
    CenterActivityListener,
  ],
  exports: [
    CentersService,
    BranchesService,
    BranchAccessService,
    CentersRepository,
    BranchesRepository,
    BranchAccessRepository,
  ],
})
export class CentersModule {}
