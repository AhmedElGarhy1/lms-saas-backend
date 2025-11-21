import { Controller, Post, Delete, Body } from '@nestjs/common';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BranchAccessDto } from '@/modules/access-control/dto/branch-access.dto';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';

@ApiTags('Centers - Branches')
@Controller('centers/branches/access')
export class BranchesAccessController {
  constructor(private readonly accessControlService: AccessControlService) {}

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
  async assignUserToBranch(
    @Body() branchAccessDto: BranchAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const branchAccess = await this.accessControlService.assignProfileToBranch(
      branchAccessDto,
      actor,
    );
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
  async removeUserFromBranch(
    @Body() branchAccessDto: BranchAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const branchAccess = await this.accessControlService.removeUserFromBranch(
      branchAccessDto,
      actor,
    );
  }
}
