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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiTags('Centers - Branches')
@Controller('centers/branches')
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
    return this.branchesService.paginateBranches(paginateDto, actor);
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
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @GetUser() actor: ActorUser,
  ) {
    return this.branchesService.getBranch(branchId, actor);
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
    return this.branchesService.createBranch(createBranchDto, actor);
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
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() data: CreateBranchDto,
    @GetUser() actor: ActorUser,
  ) {
    return this.branchesService.updateBranch(branchId, data, actor);
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
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @GetUser() actor: ActorUser,
  ) {
    return this.branchesService.deleteBranch(branchId, actor);
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
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() body: { isActive: boolean },
    @GetUser() actor: ActorUser,
  ) {
    return this.branchesService.toggleBranchStatus(
      branchId,
      body.isActive,
      actor,
    );
  }

  @Patch(':branchId/restore')
  @UpdateApiResponses('Restore deleted branch')
  @ApiParam({ name: 'branchId', description: 'Branch ID', type: String })
  @Permissions(PERMISSIONS.BRANCHES.RESTORE)
  @Transactional()
  async restoreBranch(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.branchesService.restoreBranch(branchId, actor);
    return ControllerResponse.message('Branch restored successfully');
  }
}
