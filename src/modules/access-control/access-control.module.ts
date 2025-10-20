import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { CenterAccess } from './entities/center-access.entity';
import { UserAccess } from './entities/user-access.entity';
import { RolesController } from './controllers/roles.controller';
import { RolesActionsController } from './controllers/roles-actions.controller';
import { RoleAssignController } from './controllers/role-assign.controller';
import { AccessControlService } from './services/access-control.service';
import { AccessControlHelperService } from './services/access-control-helper.service';
import { PermissionService } from './services/permission.service';
import { RolesService } from './services/roles.service';
import { PermissionRepository } from './repositories/permission.repository';
import { UserAccessRepository } from './repositories/user-access.repository';
import { RolesRepository } from './repositories/roles.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { RolePermissionRepository } from './repositories/role-permission.repository';
import { CenterAccessRepository } from './repositories/center-access.repository';
import { UserRoleSubscriber } from './subscriber/user-role.subscriber';
import { RolePermissionSubscriber } from './subscriber/role-permission.subscriber';
import { BranchAccess } from './entities/branch-access.entity';
import { BranchAccessRepository } from './repositories/branch-access.repository';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      Role,
      UserRole,
      RolePermission,
      CenterAccess,
      UserAccess,
      BranchAccess,
    ]),
  ],
  controllers: [RolesController, RolesActionsController, RoleAssignController],
  providers: [
    AccessControlService,
    AccessControlHelperService,
    PermissionService,
    RolesService,
    PermissionRepository,
    RolesRepository,
    UserRoleRepository,
    RolePermissionRepository,
    CenterAccessRepository,
    UserRoleSubscriber,
    RolePermissionSubscriber,
    UserAccessRepository,
    BranchAccessRepository,
  ],
  exports: [AccessControlService, AccessControlHelperService, RolesService],
})
export class AccessControlModule {}
