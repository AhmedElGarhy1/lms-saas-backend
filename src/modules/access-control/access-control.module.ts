import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from './controllers/roles.controller';
import { AccessControlService } from './services/access-control.service';
import { AccessControlHelperService } from './services/access-control-helper.service';
import { PermissionService } from './services/permission.service';
import { RolesService } from './services/roles.service';
import { PermissionRepository } from './repositories/permission.repository';
import { UserAccessRepository } from './repositories/user-access.repository';
import { RolesRepository } from './repositories/roles.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { Center } from '../centers/entities/center.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/roles/role.entity';
import { UserRole } from './entities/roles/user-role.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { CenterAccess } from './entities/center-access.entity';
import { UserRoleSubscriber } from './subscriber/user-role.subscriber';
import { CenterAccessRepository } from './repositories/center-access.repository';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Center,
      Permission,
      Role,
      UserRole,
      UserAccess,
      CenterAccess,
    ]),
  ],
  controllers: [RolesController],
  providers: [
    AccessControlService,
    AccessControlHelperService,
    PermissionService,
    RolesService,
    PermissionRepository,
    UserAccessRepository,
    RolesRepository,
    UserRoleRepository,
    CenterAccessRepository,
    UserRoleSubscriber,
  ],
  exports: [AccessControlService, AccessControlHelperService, RolesService],
})
export class AccessControlModule {}
