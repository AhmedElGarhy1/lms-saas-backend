import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeeder } from './seeder';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { DatabaseModule } from '@/shared/modules/database/database.module';
import { User } from '@/modules/user/entities/user.entity';
import { Profile } from '@/modules/user/entities/profile.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { RolePermission } from '@/modules/access-control/entities';

@Module({
  imports: [
    DatabaseModule,
    ActivityLogModule,
    CentersModule,
    UserModule,
    AccessControlModule,
    TypeOrmModule.forFeature([
      User,
      Profile,
      Role,
      Permission,
      UserRole,
      UserAccess,
      CenterAccess,
      RefreshToken,
      EmailVerification,
      PasswordResetToken,
      Center,
      RolePermission,
    ]),
  ],
  providers: [DatabaseSeeder],
  exports: [DatabaseSeeder],
})
export class SeederModule {}
