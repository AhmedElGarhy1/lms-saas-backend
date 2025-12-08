import { Controller, Post, Delete, Body } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { RolesService } from '../services/roles.service';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { AssignRoleDto } from '../dto/assign-role.dto';

@ApiTags('Roles')
@Controller('roles/assign')
@ApiBearerAuth()
export class RoleAssignController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @CreateApiResponses('Assign a role to a user')
  @ApiBody({ type: AssignRoleDto })
  @Permissions(PERMISSIONS.ROLES.ASSIGN)
  @Transactional()
  async assignRole(@Body() dto: AssignRoleDto, @GetUser() user: ActorUser) {
    const result = await this.rolesService.assignRoleValidate(dto, user);
    return ControllerResponse.success(result, 't.messages.assigned', {
      resource: 't.resources.role',
    });
  }

  @Delete()
  @DeleteApiResponses('Remove a role from a user')
  @ApiBody({ type: AssignRoleDto })
  @Permissions(PERMISSIONS.ROLES.ASSIGN)
  @Transactional()
  async removeRole(@Body() dto: AssignRoleDto, @GetUser() user: ActorUser) {
    const result = await this.rolesService.removeUserRoleValidate(dto, user);
    return ControllerResponse.success(result, 't.messages.removed', {
      resource: 't.resources.role',
    });
  }
}
