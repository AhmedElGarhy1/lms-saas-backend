import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  RolesController,
  RolesActionsController,
  RoleAssignController,
} from './controllers';
import {
  AccessControlService,
  AccessControlHelperService,
  PermissionService,
  RolesService,
} from './services';
import { PermissionRepository, UserAccessRepository } from './repositories';
import {
  RolesRepository,
  UserRoleRepository,
  RolePermissionRepository,
  CenterAccessRepository,
} from './repositories';
import {
  Permission,
  Role,
  UserRole,
  RolePermission,
  CenterAccess,
  UserAccess,
} from './entities';
import { UserRoleSubscriber, RolePermissionSubscriber } from './subscriber';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      Role,
      UserRole,
      RolePermission,
      UserAccess,
      CenterAccess,
    ]),
  ],
  controllers: [RolesController, RolesActionsController, RoleAssignController],
  providers: [
    AccessControlService,
    AccessControlHelperService,
    PermissionService,
    RolesService,
    PermissionRepository,
    UserAccessRepository,
    RolesRepository,
    UserRoleRepository,
    RolePermissionRepository,
    CenterAccessRepository,
    UserRoleSubscriber,
    RolePermissionSubscriber,
  ],
  exports: [AccessControlService, AccessControlHelperService, RolesService],
})
export class AccessControlModule {}
