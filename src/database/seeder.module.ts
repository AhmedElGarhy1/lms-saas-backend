import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeeder } from './seeder';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { DatabaseModule } from '@/shared/modules/database/database.module';
import { User } from '@/modules/user/entities/user.entity';
import { UserInfo } from '@/modules/user/entities/user-info.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { BranchAccess } from '@/modules/access-control/entities/branch-access.entity';
import { RolePermission } from '@/modules/access-control/entities/role-permission.entity';
import { Admin } from '@/modules/profile/entities/admin.entity';
import { UserProfile } from '@/modules/profile/entities/user-profile.entity';
import { Staff } from '@/modules/profile/entities/staff.entity';

@Module({
  imports: [
    DatabaseModule,
    ActivityLogModule,
    CentersModule,
    UserModule,
    AccessControlModule,
    TypeOrmModule.forFeature([
      User,
      UserInfo,
      UserProfile,
      Staff,
      Teacher,
      Student,
      Role,
      Permission,
      UserRole,
      UserAccess,
      CenterAccess,
      Branch,
      BranchAccess,
      EmailVerification,
      PasswordResetToken,
      Center,
      RolePermission,
      Admin,
    ]),
  ],
  providers: [DatabaseSeeder],
  exports: [DatabaseSeeder],
})
export class SeederModule {}
