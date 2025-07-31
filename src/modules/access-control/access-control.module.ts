import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlController } from './controllers/access-control.controller';
import { RolesController } from './controllers/roles.controller';
import { AccessControlService } from './services/access-control.service';
import { PermissionService } from './services/permission.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { RolesService } from './services/roles.service';
import { AccessControlRepository } from './repositories/access-control.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { UserAccessRepository } from './repositories/user-access.repository';
import { AdminCenterAccessRepository } from './repositories/admin-center-access.repository';
import { UserOnCenterRepository } from './repositories/user-on-center.repository';
import { RolesRepository } from './repositories/roles.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { Center } from './entities/center.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/roles/role.entity';
import { UserRole } from './entities/roles/user-role.entity';
import { AdminCenterAccess } from './entities/admin/admin-center-access.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { UserOnCenter } from './entities/user-on-center.entity';
import { DatabaseModule } from '@/shared/modules/database/database.module';
import { RoleEventEmitter } from '@/common/events/role.events';

@Global()
@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      Center,
      Permission,
      Role,
      UserRole,
      AdminCenterAccess,
      UserAccess,
      UserOnCenter,
    ]),
  ],
  controllers: [AccessControlController, RolesController],
  providers: [
    AccessControlService,
    PermissionService,
    PermissionCacheService,
    RolesService,
    AccessControlRepository,
    PermissionRepository,
    UserAccessRepository,
    AdminCenterAccessRepository,
    UserOnCenterRepository,
    RolesRepository,
    UserRoleRepository,
    {
      provide: RoleEventEmitter,
      useClass: RoleEventEmitter,
    },
  ],
  exports: [
    AccessControlService,
    PermissionService,
    PermissionCacheService,
    RolesService,
    RolesRepository,
    RoleEventEmitter,
    AccessControlRepository,
    PermissionRepository,
    UserAccessRepository,
    AdminCenterAccessRepository,
    UserOnCenterRepository,
    UserRoleRepository,
  ],
})
export class AccessControlModule {}
