import { Controller, Post, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AccessControlService } from '../services/access-control.service';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { AccessControlHelperService } from '../services/access-control-helper.service';
import {
  CurrentUser,
  GetUser,
} from '@/shared/common/decorators/get-user.decorator';
import { UserAccessDto } from '../dto/user-access.dto';
import { AddUserToCenterRequestDto } from '../dto/add-user-to-center.dto';
import { UserCenterParamsDto } from '../dto/user-center-params.dto';

@Controller('access-control')
@ApiTags('Access Control')
export class AccessControlController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  // ===== USER-CENTER RELATIONSHIPS =====
  @Post('centers/access')
  @ApiOperation({ summary: 'Add user to center' })
  @ApiBody({ type: UserCenterParamsDto })
  @ApiResponse({ status: 201, description: 'User added to center' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.GRANT.action)
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
  @Permissions(PERMISSIONS.ACCESS_CONTROL.CENTER_ACCESS.REVOKE.action)
  async removeUserFromCenter(
    @Body() dto: UserCenterParamsDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.accessControlService.revokeCenterAccessValidate(
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
