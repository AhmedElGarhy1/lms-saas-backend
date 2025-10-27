import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { SharedModule } from '@/shared/shared.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AdminController } from './controllers/admin.controller';
import { AdminActionsController } from './controllers/admin-actions.controller';
import { AdminService } from './services/admin.service';
import { AdminRepository } from './repositories/admin.repository';
import { AdminProfileCreationListener } from './listeners/admin-profile-creation.listener';
import { AdminAccessSetupListener } from './listeners/admin-access-setup.listener';
import { AdminRoleAssignmentListener } from './listeners/admin-role-assignment.listener';
import { AdminActivityLogListener } from './listeners/admin-activity-log.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    forwardRef(() => UserModule),
    forwardRef(() => AccessControlModule),
    SharedModule,
    ActivityLogModule,
  ],
  controllers: [AdminController, AdminActionsController],
  providers: [
    AdminService,
    AdminRepository,
    AdminProfileCreationListener,
    AdminAccessSetupListener,
    AdminRoleAssignmentListener,
    AdminActivityLogListener,
  ],
  exports: [AdminService, AdminRepository],
})
export class AdminModule {}
