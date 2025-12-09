import { Controller, Get, Query, Res, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Transactional } from '@nestjs-cls/transactional';
import { BranchesService } from '../services/branches.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ExportService } from '@/shared/common/services/export.service';
import { BranchResponseExportMapper } from '@/shared/common/mappers/branch-response-export.mapper';
import { ExportBranchesDto } from '../dto/export-branches.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkDeleteBranchesDto } from '../dto/bulk-delete-branches.dto';
import { BulkRestoreBranchesDto } from '../dto/bulk-restore-branches.dto';
import { BulkToggleBranchStatusDto } from '../dto/bulk-toggle-branch-status.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiBearerAuth()
@ApiTags('Branches Actions')
@Controller('centers/branches/actions')
export class BranchesActionsController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly exportService: ExportService,
    private readonly bulkOperationService: BulkOperationService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export branches data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.CENTER.EXPORT)
  async exportBranches(
    @Query() query: ExportBranchesDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format;

    // Get data using the same pagination logic
    const paginationResult = await this.branchesService.paginateBranches(
      query,
      actor,
    );
    const branches = paginationResult.items;

    // Create mapper
    const mapper = new BranchResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'branches';

    // Use the simplified export method
    const data = this.exportService.exportData(
      branches,
      mapper,
      format,
      baseFilename,
      res,
    );
    return data;
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete branches' })
  @ApiBody({ type: BulkDeleteBranchesDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.BRANCHES.DELETE)
  @Transactional()
  async bulkDelete(
    @Body() dto: BulkDeleteBranchesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.branchIds,
      async (branchId: string) => {
        await this.branchesService.deleteBranch(branchId, actor);
        return { id: branchId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.branch',
      },
    });
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore deleted branches' })
  @ApiBody({ type: BulkRestoreBranchesDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.BRANCHES.RESTORE)
  @Transactional()
  async bulkRestore(
    @Body() dto: BulkRestoreBranchesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.branchIds,
      async (branchId: string) => {
        await this.branchesService.restoreBranch(branchId, actor);
        return { id: branchId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.branch',
      },
    });
  }

  @Post('bulk/status')
  @ApiOperation({ summary: 'Bulk toggle branch active status' })
  @ApiBody({ type: BulkToggleBranchStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk status toggle completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.BRANCHES.ACTIVATE)
  @Transactional()
  async bulkToggleStatus(
    @Body() dto: BulkToggleBranchStatusDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.branchIds,
      async (branchId: string) => {
        await this.branchesService.toggleBranchStatus(
          branchId,
          dto.isActive,
          actor,
        );
        return { id: branchId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.branch',
      },
    });
  }
}
