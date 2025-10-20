import { Controller, Post, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BranchAccessDto } from '@/modules/access-control/dto/branch-access.dto';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';

@ApiTags('Centers - Branches')
@Controller('centers/branches/access')
export class BranchesAccessController {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Assign user to branch' })
  @ApiResponse({
    status: 201,
    description: 'User assigned to branch successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'User already assigned to branch',
  })
  @ApiResponse({
    status: 404,
    description: 'User or branch not found',
  })
  @Permissions(PERMISSIONS.CENTER.UPDATE)
  async assignUserToBranch(@Body() branchAccessDto: BranchAccessDto) {
    const branchAccess =
      await this.accessControlService.assignUserToBranch(branchAccessDto);
    // Log activity
    await this.activityLogService.log(ActivityType.USER_ACCESS_GRANTED, {
      branchId: branchAccess.branchId,
      action: 'user_branch_access_granted',
    });
    return branchAccess;
  }

  @Delete()
  @ApiOperation({ summary: 'Remove user from branch' })
  @ApiResponse({
    status: 200,
    description: 'User removed from branch successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User assignment not found',
  })
  @Permissions(PERMISSIONS.CENTER.UPDATE)
  async removeUserFromBranch(@Body() branchAccessDto: BranchAccessDto) {
    const branchAccess =
      await this.accessControlService.removeUserFromBranch(branchAccessDto);

    // Log activity
    await this.activityLogService.log(ActivityType.USER_ACCESS_REVOKED, {
      branchId: branchAccess.branchId,
      action: 'user_branch_access_revoked',
    });
  }
}
