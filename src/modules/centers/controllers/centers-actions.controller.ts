import { Controller, Get, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import {} from '@/shared/common/decorators/api-responses.decorator';
import { Query } from '@nestjs/common';
import { CentersService } from '../services/centers.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ExportService } from '@/shared/common/services/export.service';
import { CenterResponseExportMapper } from '@/shared/common/mappers/center-response-export.mapper';
import { ExportCentersDto } from '../dto/export-centers.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';

@ApiBearerAuth()
@ApiTags('Centers Actions')
@Controller('centers/actions')
export class CentersActionsController {
  constructor(
    private readonly centersService: CentersService,
    private readonly exportService: ExportService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export centers data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  // @Permissions(PERMISSIONS.CENTER.READ) // TODO: Add READ permission or use different permission
  async exportCenters(
    @Query() query: ExportCentersDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format || 'csv';

    // Get data using the same pagination logic
    const paginationResult = await this.centersService.paginateCenters(
      query,
      actor.id,
    );
    const centers = paginationResult.items;

    // Create mapper
    const mapper = new CenterResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'centers';

    // Use the simplified export method
    const data = await this.exportService.exportData(
      centers,
      mapper,
      format,
      baseFilename,
      res,
    );
    await this.activityLogService.log(ActivityType.CENTER_EXPORT, {
      userId: actor.id,
      filename: baseFilename,
    });
    return data;
  }
}
