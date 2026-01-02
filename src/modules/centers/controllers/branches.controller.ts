import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser, ManagerialOnly } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { BranchIdParamDto } from '../dto/branch-id-param.dto';

@ApiTags('Centers - Branches')
@Controller('centers/branches')
@ManagerialOnly()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all branches for a center with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Branches retrieved successfully',
  })
  async paginateBranches(
    @Query() paginateDto: PaginateBranchesDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.branchesService.paginateBranches(
      paginateDto,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Get(':branchId')
  @ApiOperation({ summary: 'Get a specific branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({
    status: 200,
    description: 'Branch retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Branch not found',
  })
  async getBranch(
    @Param() params: BranchIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.branchesService.getBranch(
      params.branchId,
      actor,
      true,
    ); // includeDeleted: true for API endpoints
    return ControllerResponse.success(result);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({
    status: 201,
    description: 'Branch created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @Permissions(PERMISSIONS.BRANCHES.CREATE)
  @Transactional()
  async createBranch(
    @Body() createBranchDto: CreateBranchDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.branchesService.createBranch(
      createBranchDto,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Put(':branchId')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({
    status: 200,
    description: 'Branch updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Branch not found',
  })
  @Permissions(PERMISSIONS.BRANCHES.UPDATE)
  @Transactional()
  async updateBranch(
    @Param() params: BranchIdParamDto,
    @Body() data: CreateBranchDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.branchesService.updateBranch(
      params.branchId,
      data,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Delete(':branchId')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({
    status: 200,
    description: 'Branch deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Branch not found',
  })
  @Permissions(PERMISSIONS.BRANCHES.DELETE)
  @Transactional()
  async deleteBranch(
    @Param() params: BranchIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.branchesService.deleteBranch(params.branchId, actor);
    return ControllerResponse.success(null);
  }

  @Patch(':branchId/status')
  @ApiOperation({ summary: 'Toggle branch active status' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({
    status: 200,
    description: 'Branch status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Branch not found',
  })
  @Permissions(PERMISSIONS.BRANCHES.ACTIVATE)
  @Transactional()
  async toggleBranchStatus(
    @Param() params: BranchIdParamDto,
    @Body() body: { isActive: boolean },
    @GetUser() actor: ActorUser,
  ) {
    await this.branchesService.toggleBranchStatus(
      params.branchId,
      body.isActive,
      actor,
    );
    return ControllerResponse.success(null);
  }

  @Patch(':branchId/restore')
  @UpdateApiResponses('Restore deleted branch')
  @ApiParam({ name: 'branchId', description: 'Branch ID', type: String })
  @Permissions(PERMISSIONS.BRANCHES.RESTORE)
  @Transactional()
  async restoreBranch(
    @Param() params: BranchIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.branchesService.restoreBranch(params.branchId, actor);
    return ControllerResponse.success(null);
  }
}
