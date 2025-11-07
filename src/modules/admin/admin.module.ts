import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { SharedModule } from '@/shared/shared.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AdminController } from './controllers/admin.controller';
import { AdminActionsController } from './controllers/admin-actions.controller';
import { AdminService } from './services/admin.service';
import { AdminRepository } from './repositories/admin.repository';
import { AdminListener } from './listeners/admin.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    forwardRef(() => UserModule),
    forwardRef(() => AccessControlModule),
    forwardRef(() => AuthModule),
    SharedModule,
    ActivityLogModule,
  ],
  controllers: [AdminController, AdminActionsController],
  providers: [AdminService, AdminRepository, AdminListener],
  exports: [AdminService, AdminRepository],
})
export class AdminModule {}
