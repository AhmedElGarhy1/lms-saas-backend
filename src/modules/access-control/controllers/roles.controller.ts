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

  // User-Role assignments
  @Post(':roleId/users')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        centerId: { type: 'string', nullable: true },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Role assigned to user' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.ASSIGN.action)
  async assignRoleToUser(
    @Param('roleId') roleId: string,
    @Body() body: { userId: string; centerId?: string },
  ) {
    return this.rolesService.assignRole({
      userId: body.userId,
      roleId,
      centerId: body.centerId,
    });
  }

  @Delete(':roleId/users/:userId')
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Center ID if applicable',
  })
  @ApiResponse({ status: 200, description: 'Role removed from user' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.REMOVE.action)
  async removeRoleFromUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @Query('centerId') centerId?: string,
  ) {
    return this.rolesService.removeUserRole({ userId, roleId, centerId });
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'scope', required: false, description: 'Filter by scope' })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Center ID for filtering',
  })
  @ApiResponse({ status: 200, description: 'User roles' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getUserRoles(
    @Param('userId') userId: string,
    @Query('scope') scope?: string,
    @Query('centerId') centerId?: string,
  ) {
    if (scope) {
      return this.rolesService.getUserRolesForScope(userId, scope, centerId);
    }
    return this.rolesService.getUserRoles(userId);
  }

  @Get('type/:type/users')
  @ApiOperation({ summary: 'Get users by role type' })
  @ApiParam({ name: 'type', type: String })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Center ID for filtering',
  })
  @ApiResponse({ status: 200, description: 'Users with role type' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getUsersByRoleType(
    @Param('type') type: string,
    @Query('centerId') centerId?: string,
  ) {
    return this.rolesService.getUsersByRoleType(type, centerId);
  }

  @Put(':roleId/permissions')
  @ApiOperation({ summary: 'Update role permissions' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissionIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['permissionIds'],
    },
  })
  @ApiResponse({ status: 200, description: 'Role permissions updated' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.UPDATE.action)
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.rolesService.updateRolePermissions(roleId, body.permissionIds);
  }

  @Get(':roleId/permissions')
  @ApiOperation({ summary: 'Get role permissions' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiResponse({ status: 200, description: 'Role permissions' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getRolePermissions(@Param('roleId') roleId: string) {
    return this.rolesService.getRolePermissions(roleId);
  }

  @Get('permissions')
  @ApiOperation({
    summary: 'Get permissions based on user context',
    description:
      'Returns permissions based on user scope - Center users get isAdmin: false, Global users get isAdmin: true',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.PERMISSIONS.VIEW.action)
  async getPermissions(@GetUser() user: CurrentUserType) {
    // Determine if user should get admin or user permissions based on their scope
    const isGlobalScope = user.scope === 'ADMIN';

    if (isGlobalScope) {
      // Global scope - return admin permissions (isAdmin: true)
      return this.permissionService.getAdminPermissions();
    } else {
      // Center scope - return user permissions (isAdmin: false)
      const allPermissions = await this.permissionService.getAllPermissions();
      return allPermissions.filter((p) => !p.isAdmin);
    }
  }

  @Get('contextual')
  @ApiOperation({
    summary: 'Get roles in current context (center/global)',
    description:
      'Returns roles based on user scope - Center users get center-specific roles, Global users get all roles',
  })
  @ApiResponse({
    status: 200,
    description: 'Contextual roles retrieved successfully',
  })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Center ID for filtering center-specific roles',
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.ROLES.VIEW.action)
  async getContextualRoles(
    @GetUser() user: CurrentUserType,
    @Query('centerId') centerId?: string,
  ) {
    const isGlobalScope = user.scope === 'ADMIN';
    const targetCenterId = centerId || user.centerId;

    if (isGlobalScope) {
      // Global scope - return all roles
      return this.rolesService.paginateRoles({} as any);
    } else {
      // Center scope - return center-specific roles
      if (targetCenterId) {
        // Get roles that are applicable to this center
        const allRoles = await this.rolesService.paginateRoles({} as any);
        return {
          ...allRoles,
          items: allRoles.items.filter((role: any) => {
            // Filter roles that are applicable to center context
            return role.type === 'CENTER_ADMIN' || role.type === 'USER';
          }),
        };
      } else {
        // No center context - return user roles only
        const allRoles = await this.rolesService.paginateRoles({} as any);
        return {
          ...allRoles,
          items: allRoles.items.filter((role: any) => role.type === 'USER'),
        };
      }
    }
  }
}
