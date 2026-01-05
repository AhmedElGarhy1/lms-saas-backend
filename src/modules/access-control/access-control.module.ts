import { forwardRef, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { ProfileRole } from './entities/profile-role.entity';
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
import { UserProfilePermissionService } from './services/user-profile-permission.service';
import { PermissionRepository } from './repositories/permission.repository';
import { UserAccessRepository } from './repositories/user-access.repository';
import { RolesRepository } from './repositories/roles.repository';
import { ProfileRoleRepository } from './repositories/profile-role.repository';
import { RolePermissionRepository } from './repositories/role-permission.repository';
import { CenterAccessRepository } from './repositories/center-access.repository';
import { ProfileRoleSubscriber } from './subscriber/profile-role.subscriber';
import { RolePermissionSubscriber } from './subscriber/role-permission.subscriber';
import { UserModule } from '../user/user.module';
import { CentersModule } from '../centers/centers.module';
import { UserAccessListener } from './listeners/user-access.listener';
import { CenterAccessListener } from './listeners/center-access.listener';
import { BranchAccessListener } from './listeners/branch-access.listener';
import { RoleListener } from './listeners/role.listener';
import { UserProfileModule } from '../user-profile/user-profile.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      Role,
      ProfileRole,
      RolePermission,
      CenterAccess,
      UserAccess,
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => CentersModule),
    forwardRef(() => UserProfileModule),
  ],
  controllers: [RoleAssignController, RolesActionsController, RolesController],
  providers: [
    AccessControlService,
    AccessControlHelperService,
    PermissionService,
    RolesService,
    UserProfilePermissionService,
    PermissionRepository,
    RolesRepository,
    ProfileRoleRepository,
    RolePermissionRepository,
    CenterAccessRepository,
    ProfileRoleSubscriber,
    RolePermissionSubscriber,
    UserAccessRepository,
    UserAccessListener,
    CenterAccessListener,
    BranchAccessListener,
    RoleListener,
  ],
  exports: [
    AccessControlService,
    AccessControlHelperService,
    RolesService,
    UserProfilePermissionService,
  ],
})
export class AccessControlModule {}
