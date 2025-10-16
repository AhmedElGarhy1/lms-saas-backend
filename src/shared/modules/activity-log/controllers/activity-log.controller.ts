import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ActivityLogService } from '../services/activity-log.service';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ExportService } from '@/shared/common/services/export.service';
import { ActivityLogExportMapper } from '@/shared/common/mappers/activity-log-export.mapper';
import { ExportActivityLogsDto } from '../dto/export-activity-logs.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';

@ApiTags('Activity Logs')
@Controller('activity-logs')
export class ActivityLogController {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated activity logs with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  async getActivityLogs(@Query() query: PaginateActivityLogsDto) {
    return this.activityLogService.getActivityLogs(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export activity logs' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  async exportActivityLogs(
    @Query() query: ExportActivityLogsDto,
    @Res() res: Response,
  ): Promise<ExportResponseDto> {
    const format = query.format || 'csv';

    // Get data using the same pagination logic
    const paginationResult =
      await this.activityLogService.getActivityLogs(query);
    const activityLogs = paginationResult.items;

    // Create mapper
    const mapper = new ActivityLogExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'activity-logs';

    // Use the simplified export method
    return await this.exportService.exportData(
      activityLogs,
      mapper,
      format,
      baseFilename,
      res,
    );
  }
}
