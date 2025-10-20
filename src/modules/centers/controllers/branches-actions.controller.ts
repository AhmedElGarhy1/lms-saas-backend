import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { BranchesService } from '../services/branches.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ExportService } from '@/shared/common/services/export.service';
import { BranchResponseExportMapper } from '@/shared/common/mappers/branch-response-export.mapper';
import { ExportBranchesDto } from '../dto/export-branches.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiBearerAuth()
@ApiTags('Branches Actions')
@Controller('centers/branches/actions')
export class BranchesActionsController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly exportService: ExportService,
    private readonly activityLogService: ActivityLogService,
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
    const data = await this.exportService.exportData(
      branches,
      mapper,
      format,
      baseFilename,
      res,
    );
    await this.activityLogService.log(ActivityType.BRANCH_EXPORT, {
      userId: actor.id,
      filename: baseFilename,
    });
    return data;
  }
}
