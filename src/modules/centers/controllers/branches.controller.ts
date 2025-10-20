import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';

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
  @Permissions(PERMISSIONS.USER.READ)
  async getBranches(
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
  @Permissions(PERMISSIONS.USER.READ)
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
  @Permissions(PERMISSIONS.CENTER.CREATE)
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
  @Permissions(PERMISSIONS.CENTER.UPDATE)
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
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.CENTER.DELETE)
  async deleteBranch(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @GetUser() actor: ActorUser,
  ) {
    return this.branchesService.deleteBranch(branchId, actor);
  }
}
