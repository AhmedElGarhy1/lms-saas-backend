import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './entities/user-profile.entity';
// Entities needed for repository operations (createProfileRefEntity, getProfileTypeRepository)
import { Staff } from '@/modules/staff/entities/staff.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Student } from '@/modules/students/entities/student.entity';
// Modules needed for services
import { AccessControlModule } from '@/modules/access-control/access-control.module'; // AccessControlHelperService
import { CentersModule } from '@/modules/centers/centers.module'; // CentersService
import { UserModule } from '@/modules/user/user.module'; // UserService
import { UserProfileController } from './controllers/user-profile.controller';
import { UserProfileService } from './services/user-profile.service';
import { UserProfileRepository } from './repositories/user-profile.repository';

@Module({
  imports: [
    // Entities for TypeORM (no full modules needed, just entities)
    TypeOrmModule.forFeature([UserProfile, Staff, Admin, Teacher, Student]),
    // Modules for services
    forwardRef(() => AccessControlModule), // AccessControlHelperService
    forwardRef(() => CentersModule), // CentersService
    forwardRef(() => UserModule), // UserService
  ],
  controllers: [UserProfileController],
  providers: [UserProfileService, UserProfileRepository],
  exports: [UserProfileService, UserProfileRepository],
})
export class UserProfileModule {}
