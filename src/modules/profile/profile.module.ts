import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { Staff } from './entities/staff.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserProfileService } from './services/user-profile.service';
import { StaffService } from './services/staff.service';
import { StaffRepository } from './repositories/staff.repository';
import { AdminRepository } from './repositories/admin.repository';
import { ProfileController } from './controllers/profile.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile, Staff, Admin]),
    forwardRef(() => UserModule),
  ],
  controllers: [ProfileController],
  providers: [
    UserProfileService,
    StaffService,
    StaffRepository,
    AdminRepository,
  ],
  exports: [UserProfileService, StaffService],
})
export class ProfileModule {}
