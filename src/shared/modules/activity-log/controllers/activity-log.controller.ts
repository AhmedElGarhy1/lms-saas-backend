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
import { ExportFormat } from '@/shared/common/dto';
import { SystemActivityType } from '../enums/system-activity-type.enum';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ReadApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ActivityLogTypesResponseDto } from '../dto/activity-log-types-response.dto';
import { SerializeOptions } from '@nestjs/common';

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
  async getActivityLogs(
    @Query() query: PaginateActivityLogsDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.activityLogService.getActivityLogs(query, actor);

    // Log activity for viewing activity logs
    await this.activityLogService.log(
      SystemActivityType.ACTIVITY_LOG_VIEWED,
      {
        filters: {
          centerId: query.centerId,
          userId: query.userId,
          type: query.type,
          page: query.page,
          limit: query.limit,
          search: query.search,
        },
        resultCount: result.items.length,
        totalCount: result.meta.totalItems,
      },
      actor,
    );

    return result;
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
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format || ExportFormat.CSV;

    // Get data using the same pagination logic
    const paginationResult = await this.activityLogService.getActivityLogs(
      query,
      actor,
    );
    const activityLogs = paginationResult.items;

    // Create mapper
    const mapper = new ActivityLogExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'activity-logs';

    // Use the simplified export method
    const data = await this.exportService.exportData(
      activityLogs,
      mapper,
      format,
      baseFilename,
      res,
    );

    // Log activity for exporting activity logs
    await this.activityLogService.log(
      SystemActivityType.ACTIVITY_LOG_EXPORTED,
      {
        format,
        filename: baseFilename,
        recordCount: activityLogs.length,
        filters: {
          centerId: query.centerId,
          userId: query.userId,
          type: query.type,
          search: query.search,
        },
      },
      actor,
    );

    return data;
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all activity log types from all modules' })
  @ReadApiResponses('Get all activity log types')
  @SerializeOptions({ type: ActivityLogTypesResponseDto })
  async getActivityLogTypes(): Promise<
    ControllerResponse<ActivityLogTypesResponseDto>
  > {
    const types = this.activityLogService.getAllActivityLogTypes();

    return ControllerResponse.success(
      types,
      'Activity log types retrieved successfully',
    );
  }
}
