import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlController } from './controllers/access-control.controller';
import { RolesController } from './controllers/roles.controller';
import { AccessControlService } from './services/access-control.service';
import { AccessControlHelperService } from './services/access-control-helper.service';
import { PermissionService } from './services/permission.service';
import { RolesService } from './services/roles.service';
import { PermissionRepository } from './repositories/permission.repository';
import { UserAccessRepository } from './repositories/user-access.repository';
import { UserOnCenterRepository } from './repositories/user-on-center.repository';
import { RolesRepository } from './repositories/roles.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { Center } from '../centers/entities/center.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/roles/role.entity';
import { UserRole } from './entities/roles/user-role.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { UserCenter } from './entities/user-center.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Center,
      Permission,
      Role,
      UserRole,
      UserAccess,
      UserCenter,
    ]),
  ],
  controllers: [AccessControlController, RolesController],
  providers: [
    AccessControlService,
    AccessControlHelperService,
    PermissionService,
    RolesService,
    PermissionRepository,
    UserAccessRepository,
    UserOnCenterRepository,
    RolesRepository,
    UserRoleRepository,
  ],
  exports: [
    AccessControlService,
    AccessControlHelperService,
    PermissionService,
    RolesService,
    RolesRepository,
    PermissionRepository,
    UserAccessRepository,
    UserOnCenterRepository,
    UserRoleRepository,
  ],
})
export class AccessControlModule {}
