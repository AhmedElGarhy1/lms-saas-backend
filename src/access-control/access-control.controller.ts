import { Body, Controller, Post, Get, Param } from '@nestjs/common';
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
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { BadRequestException } from '@nestjs/common';
import { RoleScope } from './constants/rolescope';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';

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
  @ApiBody({ type: AssignPermissionDto })
  @ApiResponse({ status: 201, description: 'Permission assigned to user' })
  assignUserPermission(@Body() dto: AssignPermissionDto) {
    if (!dto.userId) throw new BadRequestException('userId is required');
    return this.acService.assignUserPermission({
      userId: dto.userId,
      permissionId: dto.permissionId,
      scopeType: dto.scopeType ?? RoleScope.GLOBAL,
      scopeId: dto.scopeId ?? null,
    });
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
