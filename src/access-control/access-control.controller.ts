import { Body, Controller, Post, Get, Param } from '@nestjs/common';
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

  @Post('assign-permission-to-role')
  @ApiOperation({ summary: 'Assign a permission to a role' })
  @ApiBody({ type: AssignPermissionDto })
  @ApiResponse({ status: 201, description: 'Permission assigned to role' })
  assignPermissionToRole(@Body() dto: AssignPermissionDto) {
    return this.acService.assignPermissionToRole(dto);
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
}
