import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AccessControlService } from './access-control.service';
import {
  CreatePermissionRequestSchema,
  CreatePermissionRequestDto,
} from './dto/create-permission.dto';
import { AssignPermissionRequestDto } from './dto/assign-permission.dto';
import {
  CreateRoleRequestSchema,
  CreateRoleRequestDto,
} from './dto/create-role.dto';
import {
  UpdateRoleRequestSchema,
  UpdateRoleRequestDto,
} from './dto/update-role.dto';
import { BadRequestException } from '@nestjs/common';
import { RoleScopeEnum } from './constants/role-scope.enum';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { Request } from 'express';
import { PermissionsGuard } from '../shared/guards/permissions.guard';
import { GetUser } from 'src/shared/decorators/get-user.decorator';
import { CurrentUser } from 'src/shared/types/current-user.type';

@ApiTags('access-control')
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly acService: AccessControlService) {}

  @Post('permissions')
  @ApiOperation({ summary: 'Create a permission' })
  @ApiBody({ type: CreatePermissionRequestDto })
  @ApiResponse({ status: 201, description: 'Permission created' })
  async createPermission(
    @Body(new ZodValidationPipe(CreatePermissionRequestSchema))
    dto: CreatePermissionRequestDto,
  ) {
    return this.acService.createPermission(dto);
  }

  @Post('assign-permission')
  @ApiOperation({
    summary: 'Assign a permission override to a user (context-aware)',
  })
  @ApiBody({ type: AssignPermissionRequestDto })
  @ApiResponse({ status: 201, description: 'Permission assigned to user' })
  assignUserPermission(@Body() dto: AssignPermissionRequestDto) {
    if (!dto.userId) throw new BadRequestException('userId is required');
    return this.acService.assignUserPermission({
      userId: dto.userId,
      permissionId: dto.permissionId,
      scopeType: dto.scopeType ?? RoleScopeEnum.GLOBAL,
      scopeId: dto.scopeId ?? null,
    });
  }

  @Get('user/:userId/permissions')
  @ApiOperation({
    summary: 'Get user permissions (resolved + overrides)',
    description:
      'Get user permissions. Use centerId query parameter to filter by specific center scope.',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({
    status: 200,
    description: 'User permissions (resolved + overrides)',
  })
  getUserPermissions(
    @Param('userId') userId: string,
    @Query('centerId') centerId?: string,
  ) {
    return this.acService.getUserPermissions(userId, centerId);
  }

  @UseGuards(PermissionsGuard)
  @Get('user/:userId/roles')
  @ApiOperation({
    summary: 'Get user roles filtered by current scope (global or center)',
    description:
      'Get user roles. Use centerId query parameter to filter by specific center scope.',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({
    status: 200,
    description: 'User roles for the current scope',
  })
  async getUserRolesForScope(
    @Param('userId') userId: string,
    @GetUser() user: CurrentUser,
    @Query('centerId') centerId?: string,
  ) {
    // Use provided centerId or fall back to user's current scope
    if (centerId) {
      return this.acService.getUserRolesForScope(
        userId,
        RoleScopeEnum.CENTER,
        centerId,
      );
    } else if (user.scope === RoleScopeEnum.CENTER) {
      return this.acService.getUserRolesForScope(
        userId,
        user.scope,
        user.centerId,
      );
    } else {
      return this.acService.getUserRolesForScope(userId, user.scope);
    }
  }

  // Get all permissions
  @Get('permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'List of all permissions' })
  getAllPermissions() {
    return this.acService.getAllPermissions();
  }

  @UseGuards(PermissionsGuard)
  @Get('roles')
  @ApiOperation({
    summary: 'Get available roles for the current scope (global or center)',
    description:
      'Get available roles. Use centerId query parameter to get roles for specific center.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of roles for the current scope',
  })
  async getRolesForScope(
    @GetUser() user: CurrentUser,
    @Query('centerId') centerId?: string,
  ) {
    // Use provided centerId or fall back to user's current scope
    if (centerId) {
      return this.acService.getInternalRoles(centerId);
    } else if (user.scope === RoleScopeEnum.CENTER) {
      if (!user.centerId)
        throw new BadRequestException(
          'x-scope-id header is required for CENTER scope',
        );
      return this.acService.getInternalRoles(user.centerId);
    } else {
      return this.acService.getGlobalRoles();
    }
  }

  @UseGuards(PermissionsGuard)
  @Post('roles')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiBody({ type: CreateRoleRequestDto })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async createRole(
    @Body(new ZodValidationPipe(CreateRoleRequestSchema))
    dto: CreateRoleRequestDto,
  ) {
    return this.acService.createRole(dto);
  }

  @UseGuards(PermissionsGuard)
  @Get('roles/:roleId')
  @ApiOperation({ summary: 'Get a specific role by ID' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiResponse({ status: 200, description: 'Role details' })
  async getRoleById(@Param('roleId') roleId: string) {
    return this.acService.getRoleById(roleId);
  }

  @UseGuards(PermissionsGuard)
  @Put('roles/:roleId')
  @ApiOperation({ summary: 'Update an existing role' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiBody({ type: UpdateRoleRequestDto })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(
    @Param('roleId') roleId: string,
    @Body(new ZodValidationPipe(UpdateRoleRequestSchema))
    dto: UpdateRoleRequestDto,
  ) {
    return this.acService.updateRole(roleId, dto);
  }

  @UseGuards(PermissionsGuard)
  @Delete('roles/:roleId')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'roleId', type: String })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  async deleteRole(@Param('roleId') roleId: string) {
    return this.acService.deleteRole(roleId);
  }

  // Remove CenterAccess endpoints - no longer needed
  // Center access is now handled by UserOnCenter model

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
