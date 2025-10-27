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
import { StaffProfileCreationListener } from './listeners/staff-profile-creation.listener';
import { StaffAccessSetupListener } from './listeners/staff-access-setup.listener';
import { StaffRoleAssignmentListener } from './listeners/staff-role-assignment.listener';
import { CenterCreatedListener } from './listeners/center-created.listener';
import { StaffActivityLogListener } from './listeners/staff-activity-log.listener';

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
    StaffProfileCreationListener,
    StaffAccessSetupListener,
    StaffRoleAssignmentListener,
    CenterCreatedListener,
    StaffActivityLogListener,
  ],
  exports: [StaffService, StaffRepository],
})
export class StaffModule {}
