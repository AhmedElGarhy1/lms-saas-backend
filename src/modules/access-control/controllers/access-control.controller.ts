import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
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
import { UserAccessDto } from '../dto/user-access.dto';
import { AddUserToCenterRequestDto } from '../dto/add-user-to-center.dto';
import { UserIdParamDto } from '../dto/user-id-param.dto';
import { UserCenterParamsDto } from '../dto/user-center-params.dto';

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
  @Post('centers/access')
  @ApiOperation({ summary: 'Add user to center' })
  @ApiBody({ type: UserCenterParamsDto })
  @ApiResponse({ status: 201, description: 'User added to center' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.ADD_USER.action)
  async addUserToCenter(
    @Body() dto: AddUserToCenterRequestDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.accessControlService.grantCenterAccessValidate(
      dto.userId,
      dto.centerId,
      user.id,
    );
  }

  @Delete('/centers/access')
  @ApiOperation({ summary: 'Remove user from center' })
  @ApiBody({ type: UserCenterParamsDto })
  @ApiResponse({ status: 200, description: 'User removed from center' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.REMOVE_USER.action)
  async removeUserFromCenter(
    @Body() dto: UserCenterParamsDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.accessControlService.revokeCenterAccess(
      user.id,
      dto.userId,
      dto.centerId,
    );
  }

  // ===== USER-USER ACCESS RELATIONSHIPS =====
  @Post('users/access')
  @ApiOperation({ summary: 'Grant user access to another user' })
  @ApiBody({ type: UserAccessDto })
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
  grantUserAccess(@Body() dto: UserAccessDto, @GetUser() user: CurrentUser) {
    return this.accessControlService.grantUserAccessValidate({
      userId: user.id,
      granterUserId: dto.granterUserId,
      targetUserId: dto.targetUserId,
      centerId: dto.centerId,
    });
  }

  @Delete('users/access')
  @ApiOperation({ summary: 'Revoke user access to another user' })
  @ApiBody({ type: UserAccessDto })
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
  revokeUserAccess(@Body() dto: UserAccessDto, @GetUser() user: CurrentUser) {
    return this.accessControlService.revokeUserAccessValidate({
      userId: user.id,
      granterUserId: dto.granterUserId,
      targetUserId: dto.targetUserId,
      centerId: dto.centerId,
    });
  }
}
