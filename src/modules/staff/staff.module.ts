import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from './entities/staff.entity';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { SharedModule } from '@/shared/shared.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { StaffController } from './controllers/staff.controller';
import { StaffActionsController } from './controllers/staff-actions.controller';
import { StaffService } from './services/staff.service';
import { StaffRepository } from './repositories/staff.repository';
import { StaffListener } from './listeners/staff.listener';
import { CenterListener } from './listeners/center.listener';
import { ActivityLogListener } from './listeners/activity-log.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff]),
    forwardRef(() => UserModule),
    forwardRef(() => AccessControlModule),
    SharedModule,
    ActivityLogModule,
  ],
  controllers: [StaffController, StaffActionsController],
  providers: [
    StaffService,
    StaffRepository,
    StaffListener,
    CenterListener,
    ActivityLogListener,
  ],
  exports: [StaffService, StaffRepository],
})
export class StaffModule {}
