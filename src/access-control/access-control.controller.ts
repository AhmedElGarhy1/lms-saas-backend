import { Body, Controller, Post, Get, Param, Put } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AccessControlService } from './access-control.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@ApiTags('access-control')
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly acService: AccessControlService) {}

  // Existing endpoints...
  @Post('roles/global')
  @ApiOperation({ summary: 'Create a global role' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, description: 'Global role created' })
  createGlobalRole(@Body() dto: CreateRoleDto) {
    return this.acService.createGlobalRole(dto);
  }

  @Post('roles/internal')
  @ApiOperation({ summary: 'Create an internal (center) role' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, description: 'Internal role created' })
  createInternalRole(@Body() dto: CreateRoleDto) {
    return this.acService.createInternalRole(dto);
  }

  @Post('permissions')
  @ApiOperation({ summary: 'Create a permission' })
  @ApiBody({ type: CreatePermissionDto })
  @ApiResponse({ status: 201, description: 'Permission created' })
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.acService.createPermission(dto);
  }

  @Post('assign-role')
  @ApiOperation({ summary: 'Assign a role to a user (context-aware)' })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({ status: 201, description: 'Role assigned to user' })
  assignRole(@Body() dto: AssignRoleDto) {
    return this.acService.assignRole(dto);
  }

  @Post('assign-permission')
  @ApiOperation({
    summary: 'Assign a permission override to a user (context-aware)',
  })
  @ApiBody({ type: AssignPermissionDto })
  @ApiResponse({ status: 201, description: 'Permission assigned to user' })
  assignUserPermission(@Body() dto: AssignPermissionDto) {
    return this.acService.assignUserPermission(dto);
  }

  @Put('role/:roleId/permissions')
  @ApiOperation({
    summary: 'Update role permissions (bulk)',
    description:
      'Replace all permissions for a role with the provided permission IDs',
  })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiBody({ type: UpdateRolePermissionsDto })
  @ApiResponse({ status: 200, description: 'Role permissions updated' })
  updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.acService.updateRolePermissions(roleId, dto.permissionIds);
  }

  @Get('role/:roleId/permissions')
  @ApiOperation({
    summary: 'Get role permissions',
    description:
      'Get all permissions assigned to a specific role (from JSON field)',
  })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role permissions' })
  getRolePermissions(@Param('roleId') roleId: string) {
    return this.acService.getRolePermissions(roleId);
  }

  @Get('user/:userId/roles')
  @ApiOperation({ summary: 'Get user roles with scopes' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 200, description: 'User roles with scopes' })
  getUserRoles(@Param('userId') userId: string) {
    return this.acService.getUserRoles(userId);
  }

  @Get('user/:userId/permissions')
  @ApiOperation({ summary: 'Get user permissions (resolved + overrides)' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({
    status: 200,
    description: 'User permissions (resolved + overrides)',
  })
  getUserPermissions(@Param('userId') userId: string) {
    return this.acService.getUserPermissions(userId);
  }

  // Get all permissions
  @Get('permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'List of all permissions' })
  getAllPermissions() {
    return this.acService.getAllPermissions();
  }

  // Get global roles
  @Get('roles/global')
  @ApiOperation({ summary: 'Get all global roles' })
  @ApiResponse({ status: 200, description: 'List of global roles' })
  getGlobalRoles() {
    return this.acService.getGlobalRoles();
  }

  // Get internal (center) roles by centerId
  @Get('roles/internal/:centerId')
  @ApiOperation({ summary: 'Get internal roles for a specific center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({
    status: 200,
    description: 'List of internal roles for the center',
  })
  getInternalRoles(@Param('centerId') centerId: string) {
    return this.acService.getInternalRoles(centerId);
  }

  // Get all roles (global + internal for a specific center)
  @Get('roles/all')
  @Get('roles/all/:centerId')
  @ApiOperation({ summary: 'Get all roles (global + internal for a center)' })
  @ApiParam({
    name: 'centerId',
    description: 'Center ID (optional)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'List of all roles' })
  getAllRoles(@Param('centerId') centerId?: string) {
    return this.acService.getAllRoles(centerId);
  }

  // Get admin roles (global + internal for a specific center)
  @Get('roles/admin')
  @Get('roles/admin/:centerId')
  @ApiOperation({ summary: 'Get admin roles (global + internal for a center)' })
  @ApiParam({
    name: 'centerId',
    description: 'Center ID (optional)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'List of admin roles' })
  getAdminRoles(@Param('centerId') centerId?: string) {
    return this.acService.getAdminRoles(centerId);
  }

  // Get admin permissions
  @Get('permissions/admin')
  @ApiOperation({ summary: 'Get all admin permissions' })
  @ApiResponse({ status: 200, description: 'List of admin permissions' })
  getAdminPermissions() {
    return this.acService.getAdminPermissions();
  }

  // CenterAccess management
  @Post('center-access/grant')
  @ApiOperation({ summary: 'Grant CenterAccess to a user' })
  @ApiBody({
    schema: {
      properties: { userId: { type: 'string' }, centerId: { type: 'string' } },
    },
  })
  grantCenterAccess(@Body() body: { userId: string; centerId: string }) {
    return this.acService.grantCenterAccess(body.userId, body.centerId);
  }

  @Post('center-access/revoke')
  @ApiOperation({ summary: 'Revoke CenterAccess from a user' })
  @ApiBody({
    schema: {
      properties: { userId: { type: 'string' }, centerId: { type: 'string' } },
    },
  })
  revokeCenterAccess(@Body() body: { userId: string; centerId: string }) {
    return this.acService.revokeCenterAccess(body.userId, body.centerId);
  }

  @Get('center-access/:userId')
  @ApiOperation({ summary: 'List all centers a user has access to' })
  listCenterAccesses(@Param('userId') userId: string) {
    return this.acService.listCenterAccesses(userId);
  }

  // UserAccess management
  @Post('user-access/grant')
  @ApiOperation({ summary: 'Grant UserAccess to a user (to another user)' })
  @ApiBody({
    schema: {
      properties: {
        userId: { type: 'string' },
        targetUserId: { type: 'string' },
      },
    },
  })
  grantUserAccess(@Body() body: { userId: string; targetUserId: string }) {
    return this.acService.grantUserAccess(body.userId, body.targetUserId);
  }

  @Post('user-access/revoke')
  @ApiOperation({ summary: 'Revoke UserAccess from a user (to another user)' })
  @ApiBody({
    schema: {
      properties: {
        userId: { type: 'string' },
        targetUserId: { type: 'string' },
      },
    },
  })
  revokeUserAccess(@Body() body: { userId: string; targetUserId: string }) {
    return this.acService.revokeUserAccess(body.userId, body.targetUserId);
  }

  @Get('user-access/:userId')
  @ApiOperation({ summary: 'List all users a user has access to' })
  listUserAccesses(@Param('userId') userId: string) {
    return this.acService.listUserAccesses(userId);
  }
}
