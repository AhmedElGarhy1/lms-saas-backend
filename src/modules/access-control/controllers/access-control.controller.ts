import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AccessControlService } from '../services/access-control.service';
import { Paginate } from '@/shared/common/decorators/pagination.decorator';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { PaginationDocs } from '@/shared/common/decorators/pagination-docs.decorator';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { AccessControlHelperService } from '../services/access-control-helper.service';
import {
  CurrentUser,
  GetUser,
} from '@/shared/common/decorators/get-user.decorator';
import { User } from '@/modules/user/entities';
import { GrantUserAccessRequestDto } from '../dto/grant-user-access.dto';
import { GrantAdminCenterAccessRequestDto } from '../dto/grant-admin-center-access.dto';
import { AddUserToCenterRequestDto } from '../dto/add-user-to-center.dto';
import { UserIdParamDto } from '../dto/user-id-param.dto';
import { UserCenterParamsDto } from '../dto/user-center-params.dto';
import { UserTargetUserParamsDto } from '../dto/user-target-user-params.dto';
import { CenterIdQueryDto } from '../dto/center-id-query.dto';

@Controller('access-control')
@ApiTags('Access Control')
export class AccessControlController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  // ===== PERMISSION MANAGEMENT =====
  @Get('permissions')
  @ApiOperation({ summary: 'Get permissions with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC/DESC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  @PaginationDocs({
    searchFields: ['action', 'description'],
    filterFields: ['isAdmin'],
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.PERMISSIONS.VIEW.action)
  async getPermissions(@Paginate() query: PaginationQuery) {
    return this.accessControlService.paginatePermissions(query);
  }

  @Get('permissions/admin')
  @ApiOperation({ summary: 'Get admin-specific permissions with pagination' })
  @ApiResponse({ status: 200, description: 'Admin permissions' })
  @PaginationDocs({
    searchFields: ['action', 'description'],
    filterFields: ['isAdmin'],
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.PERMISSIONS.VIEW.action)
  getAdminPermissions(@Paginate() query: PaginationQuery) {
    return this.accessControlService.getAdminPermissionsPublic();
  }

  // ===== USER-CENTER RELATIONSHIPS =====
  @Get('users/:userId/centers')
  @ApiOperation({ summary: 'Get centers for a specific user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({
    status: 200,
    description: 'User centers retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID format' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.CHECK.action)
  async getUserCenters(@Param() params: UserIdParamDto) {
    return this.accessControlService.getUserCenters(params.userId);
  }

  @Post('users/:userId/centers')
  @ApiOperation({ summary: 'Add user to center' })
  @ApiParam({ name: 'userId', type: String })
  @ApiBody({ type: AddUserToCenterRequestDto })
  @ApiResponse({ status: 201, description: 'User added to center' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.ADD_USER.action)
  async addUserToCenter(
    @Param() params: UserIdParamDto,
    @Body() dto: AddUserToCenterRequestDto,
  ) {
    return this.accessControlService.addUserToCenter({
      userId: params.userId,
      centerId: dto.centerId,
    });
  }

  @Delete('users/:userId/centers/:centerId')
  @ApiOperation({ summary: 'Remove user from center' })
  @ApiParam({ name: 'userId', type: String })
  @ApiParam({ name: 'centerId', type: String })
  @ApiResponse({ status: 200, description: 'User removed from center' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.REMOVE_USER.action)
  async removeUserFromCenter(@Param() params: UserCenterParamsDto) {
    return this.accessControlService.removeUserFromCenter({
      userId: params.userId,
      centerId: params.centerId,
    });
  }

  // ===== USER-ADMIN RELATIONSHIPS =====
  @Get('users/:userId/admins')
  @ApiOperation({ summary: 'Get admin center access for a specific user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({
    status: 200,
    description: 'User admin access retrieved successfully',
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.CHECK.action)
  async getUserAdminAccess(@Param() params: UserIdParamDto) {
    return this.accessControlService.getAdminCenterAccess(params.userId);
  }

  @Post('users/:userId/admins')
  @ApiOperation({ summary: 'Grant admin center access to user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiBody({ type: GrantAdminCenterAccessRequestDto })
  @ApiResponse({ status: 201, description: 'Admin center access granted' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.GRANT_ADMIN.action)
  grantAdminCenterAccess(
    @Param() params: UserIdParamDto,
    @Body() dto: GrantAdminCenterAccessRequestDto,
  ) {
    return this.accessControlService.grantAdminCenterAccess({
      adminId: params.userId,
      centerId: dto.centerId,
      grantedBy: dto.grantedBy,
    });
  }

  @Delete('users/:userId/admins/:centerId')
  @ApiOperation({ summary: 'Revoke admin center access from user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiParam({ name: 'centerId', type: String })
  @ApiResponse({ status: 200, description: 'Admin center access revoked' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.REVOKE_ADMIN.action)
  revokeAdminCenterAccess(@Param() params: UserCenterParamsDto) {
    return this.accessControlService.revokeAdminCenterAccess({
      adminId: params.userId,
      centerId: params.centerId,
    });
  }

  // ===== USER-USER ACCESS RELATIONSHIPS =====
  @Get('users/:userId/access')
  @ApiOperation({ summary: 'Get users that this user can access/manage' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({
    status: 200,
    description: 'User access list retrieved successfully',
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.CHECK.action)
  async getUserAccessList(@Param() params: UserIdParamDto) {
    return this.accessControlService.listUserAccesses(params.userId);
  }

  @Post('users/:userId/access')
  @ApiOperation({ summary: 'Grant user access to another user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiBody({ type: GrantUserAccessRequestDto })
  @ApiResponse({ status: 201, description: 'User access granted' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 403,
    description: 'Access denied: Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot grant access to SUPER_ADMIN or CENTER_ADMIN users',
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.GRANT.action)
  grantUserAccess(
    @Param() params: UserIdParamDto,
    @Body() dto: GrantUserAccessRequestDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.accessControlService.grantUserAccess({
      userId: user.id,
      granterUserId: params.userId,
      targetUserId: dto.targetUserId,
      centerId: dto.centerId,
    });
  }

  @Delete('users/:userId/access/:targetUserId')
  @ApiOperation({ summary: 'Revoke user access to another user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiParam({ name: 'targetUserId', type: String })
  @ApiQuery({ name: 'centerId', required: false, description: 'Center ID' })
  @ApiResponse({ status: 200, description: 'User access revoked' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 403,
    description: 'Access denied: Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot revoke access from SUPER_ADMIN or CENTER_ADMIN users',
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.REVOKE.action)
  revokeUserAccess(
    @Param() params: UserTargetUserParamsDto,
    @Query() query: CenterIdQueryDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.accessControlService.revokeUserAccess({
      userId: user.id,
      granterUserId: params.userId,
      targetUserId: params.targetUserId,
      centerId: query.centerId,
    });
  }

  // ===== ACCESS CHECKING ENDPOINTS =====
  @Get('checks/user-access/:userId/:targetUserId')
  @ApiOperation({ summary: 'Check user access to another user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiParam({ name: 'targetUserId', type: String })
  @ApiQuery({ name: 'centerId', required: false, description: 'Center ID' })
  @ApiResponse({ status: 200, description: 'Access check result' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.CHECK.action)
  checkUserAccess(
    @Param() params: UserTargetUserParamsDto,
    @GetUser() user: CurrentUser,
    @Query() query: CenterIdQueryDto,
  ) {
    const centerId = user.centerId || query.centerId;
    return this.accessControlHelperService.canAccessUser(
      params.userId,
      params.targetUserId,
    );
  }

  @Get('checks/center-access/:userId/:centerId')
  @ApiOperation({ summary: 'Check user center access' })
  @ApiParam({ name: 'userId', type: String })
  @ApiParam({ name: 'centerId', type: String })
  @ApiResponse({ status: 200, description: 'Center access check result' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.CHECK.action)
  checkCenterAccess(@Param() params: UserCenterParamsDto) {
    return this.accessControlHelperService.canAccessCenter(
      params.userId,
      params.centerId,
    );
  }

  @Get('checks/user-permissions/:userId')
  @ApiOperation({ summary: 'Check user permissions' })
  @ApiParam({ name: 'userId', description: 'User ID', type: String })
  @ApiQuery({ name: 'centerId', required: false, description: 'Center ID' })
  @ApiResponse({ status: 200, description: 'User permissions' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.CHECK_PERMISSIONS.action)
  checkUserPermissions(
    @Param() params: UserIdParamDto,
    @GetUser() user: CurrentUser,
    @Query() query: CenterIdQueryDto,
  ) {
    const centerId = user.centerId || query.centerId;
    return this.accessControlHelperService.getUserPermissions(params.userId);
  }
}
