import { Controller, Post, Delete, Body } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { BranchAccessService } from '../services/branch-access.service';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BulkGrantBranchAccessDto } from '@/modules/centers/dto/bulk-grant-branch-access.dto';
import { BulkRevokeBranchAccessDto } from '@/modules/centers/dto/bulk-revoke-branch-access.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ManagerialOnly } from '@/shared/common/decorators';

@ApiTags('Centers - Branches')
@Controller('centers/branches/access')
@ManagerialOnly()
export class BranchesAccessController {
  constructor(
    private readonly branchAccessService: BranchAccessService,
    private readonly bulkOperationService: BulkOperationService,
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
  @Permissions(PERMISSIONS.STAFF.GRANT_BRANCH_ACCESS)
  @Transactional()
  async assignUserToBranch(
    @Body() branchAccessDto: BranchAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const branchAccess = await this.branchAccessService.assignProfileToBranch(
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
  @Permissions(PERMISSIONS.STAFF.GRANT_BRANCH_ACCESS)
  @Transactional()
  async removeUserFromBranch(
    @Body() branchAccessDto: BranchAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.branchAccessService.removeProfileFromBranch(
      branchAccessDto,
      actor,
    );
  }

  @Post('bulk/grant')
  @ApiOperation({ summary: 'Bulk grant branch access to multiple users' })
  @ApiBody({ type: BulkGrantBranchAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk grant completed',
    type: BulkOperationResultDto,
  })
  @Transactional()
  async bulkGrantBranchAccess(
    @Body() dto: BulkGrantBranchAccessDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        const branchAccessDto: BranchAccessDto = {
          userProfileId,
          branchId: dto.branchId,
          centerId: actor.centerId!,
        };
        await this.branchAccessService.assignProfileToBranch(
          branchAccessDto,
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, 'Bulk operation completed successfully');
  }

  @Post('bulk/revoke')
  @ApiOperation({ summary: 'Bulk revoke branch access from multiple users' })
  @ApiBody({ type: BulkRevokeBranchAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk revoke completed',
    type: BulkOperationResultDto,
  })
  @Transactional()
  async bulkRevokeBranchAccess(
    @Body() dto: BulkRevokeBranchAccessDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        const branchAccessDto: BranchAccessDto = {
          userProfileId,
          branchId: dto.branchId,
          centerId: actor.centerId!,
        };
        await this.branchAccessService.removeProfileFromBranch(
          branchAccessDto,
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, 'Bulk operation completed successfully');
  }
}
