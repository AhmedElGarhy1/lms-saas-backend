import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeeder } from './seeder';
import { User } from '@/modules/user/entities/user.entity';
import { Profile } from '@/modules/user/entities/profile.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { AdminCenterAccess } from '@/modules/access-control/entities/admin/admin-center-access.entity';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { CentersModule } from '@/modules/centers/centers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Profile,
      Center,
      Role,
      Permission,
      UserRole,
      UserAccess,
      AdminCenterAccess,
    ]),
    ActivityLogModule,
    CentersModule,
  ],
  providers: [DatabaseSeeder],
  exports: [DatabaseSeeder],
})
export class SeederModule {}
