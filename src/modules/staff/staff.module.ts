import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from './entities/staff.entity';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { SharedModule } from '@/shared/shared.module';
import { StaffController } from './controllers/staff.controller';
import { StaffActionsController } from './controllers/staff-actions.controller';
import { StaffService } from './services/staff.service';
import { StaffRepository } from './repositories/staff.repository';
import { StaffListener } from './listeners/staff.listener';
import { CenterListener } from './listeners/center.listener';
import { UserProfileModule } from '../user-profile/user-profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff]),
    forwardRef(() => UserModule),
    forwardRef(() => AccessControlModule),
    forwardRef(() => AuthModule),
    UserProfileModule,
    SharedModule,
  ],
  controllers: [StaffController, StaffActionsController],
  providers: [StaffService, StaffRepository, StaffListener, CenterListener],
  exports: [StaffService, StaffRepository],
})
export class StaffModule {}
