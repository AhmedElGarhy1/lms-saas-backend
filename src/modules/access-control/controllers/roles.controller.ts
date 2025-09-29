import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { PermissionService } from '../services/permission.service';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { UpdateRoleRequestDto } from '../dto/update-role.dto';
import { Paginate } from '@/shared/common/decorators/pagination.decorator';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { PaginationDocs } from '@/shared/common/decorators/pagination-docs.decorator';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '@/shared/common/types/current-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionService: PermissionService,
  ) {}

  @Get('permissions')
  @ApiOperation({ summary: 'Get permissions' })
  @ApiParam({ name: 'type', type: String })
  @ApiResponse({ status: 200, description: 'Permissions details' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getPermissions(
    @Param('type') type: 'admin' | 'user' | 'all' = 'all',
    @GetUser() user: CurrentUserType,
  ) {
    return this.permissionService.getPermissions(type, user.id);
  }

  @Post()
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.CREATE.action)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
  })
  @ApiBody({ type: CreateRoleRequestDto })
  async createRole(@Body() dto: CreateRoleRequestDto) {
    return this.rolesService.createRole(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get roles with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC/DESC)',
  })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @PaginationDocs({
    searchFields: ['name', 'description'],
    filterFields: ['type', 'isActive'],
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getRoles(
    @Paginate() query: PaginationQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.rolesService.paginateRoles(query);
  }

  @Get(':roleId')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiResponse({ status: 200, description: 'Role details' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getRoleById(@Param('roleId') roleId: string) {
    return this.rolesService.findById(roleId);
  }

  @Put(':roleId')
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.UPDATE.action)
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiBody({ type: UpdateRoleRequestDto })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleRequestDto,
  ) {
    return this.rolesService.updateRole(roleId, dto);
  }

  @Delete(':roleId')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.DELETE.action)
  async deleteRole(@Param('roleId') roleId: string) {
    return this.rolesService.deleteRole(roleId);
  }
}
