import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { RolesService } from '../services/roles.service';
import { PermissionService } from '../services/permission.service';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { UpdateRoleRequestDto } from '../dto/update-role.dto';
import { PaginationDocs } from '@/shared/common/decorators/pagination-docs.decorator';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { RoleResponseDto } from '../dto/role-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionService: PermissionService,
  ) {}

  @Get('permissions')
  @ReadApiResponses('Get permissions')
  @ApiParam({ name: 'type', type: String })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getPermissions(
    @Param('type') type: 'admin' | 'user' | 'all' = 'all',
    @GetUser() user: ActorUser,
  ) {
    const result = await this.permissionService.getPermissions(type, user);
    return ControllerResponse.success(
      result,
      'Permissions retrieved successfully',
    );
  }

  @Post()
  @CreateApiResponses('Create a new role')
  @ApiBody({ type: CreateRoleRequestDto })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.CREATE.action)
  async createRole(
    @Body() dto: CreateRoleRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.rolesService.createRole(dto, actor);
    return ControllerResponse.success(result, 'Role created successfully');
  }

  @Get()
  @ReadApiResponses('Get roles with pagination')
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC/DESC)',
  })
  @SerializeOptions({ type: RoleResponseDto })
  @PaginationDocs({
    searchFields: ['name', 'description'],
    filterFields: ['type', 'isActive'],
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getRoles(
    @Query() query: PaginateRolesDto,
    @GetUser() actor: ActorUser,
  ) {
    return this.rolesService.paginateRoles(query, actor);
  }

  @Post('assign')
  @CreateApiResponses('Assign a role to a user')
  @ApiBody({ type: AssignRoleDto })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.ASSIGN.action)
  async assignRole(@Body() dto: AssignRoleDto, @GetUser() user: ActorUser) {
    const result = await this.rolesService.assignRoleValidate(dto, user);
    return ControllerResponse.success(result, 'Role assigned successfully');
  }

  @Delete('assign')
  @DeleteApiResponses('Remove a role from a user')
  @ApiBody({ type: AssignRoleDto })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.REMOVE.action)
  async removeRole(@Body() dto: AssignRoleDto, @GetUser() user: ActorUser) {
    const result = await this.rolesService.removeUserRoleValidate(dto, user);
    return ControllerResponse.success(result, 'Role removed successfully');
  }

  @Get(':roleId')
  @ReadApiResponses('Get role by ID')
  @ApiParam({ name: 'roleId', type: String })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getRoleById(
    @Param('roleId') roleId: string,
    @GetUser() user: ActorUser,
  ) {
    const result = await this.rolesService.findById(roleId);
    return ControllerResponse.success(result, 'Role retrieved successfully');
  }

  @Put(':roleId')
  @UpdateApiResponses('Update a role')
  @ApiParam({ name: 'roleId', type: String })
  @ApiBody({ type: UpdateRoleRequestDto })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.UPDATE.action)
  async updateRole(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleRequestDto,
    @GetUser() user: ActorUser,
  ) {
    const result = await this.rolesService.updateRole(roleId, dto, user);
    return ControllerResponse.success(result, 'Role updated successfully');
  }

  @Delete(':roleId')
  @DeleteApiResponses('Delete a role')
  @ApiParam({ name: 'roleId', type: String })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.DELETE.action)
  async deleteRole(
    @Param('roleId') roleId: string,
    @GetUser() user: ActorUser,
  ) {
    const result = await this.rolesService.deleteRole(roleId, user);
    return ControllerResponse.success(result, 'Role deleted successfully');
  }
}
