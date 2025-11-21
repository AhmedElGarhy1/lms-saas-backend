import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AdminService } from '../services/admin.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { ExportService } from '@/shared/common/services/export.service';
import { UserResponseExportMapper } from '@/shared/common/mappers/user-response-export.mapper';
import { ExportUsersDto } from '@/modules/user/dto/export-users.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { SystemActivityType } from '@/shared/modules/activity-log/enums/system-activity-type.enum';

@ApiTags('Admin Actions')
@Controller('admin/actions')
export class AdminActionsController {
  constructor(
    private readonly adminService: AdminService,
    private readonly i18n: I18nService<I18nTranslations>,
    private readonly exportService: ExportService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ===== EXPORT FUNCTIONALITY =====
  @Get('export')
  @ApiOperation({ summary: 'Export admin data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.ADMIN.EXPORT)
  async exportAdmins(
    @Query() query: ExportUsersDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format;

    // Get data using admin pagination logic
    const paginationResult = await this.adminService.paginateAdmins(
      query,
      actor,
    );
    const users = paginationResult.items;

    // Create mapper
    const mapper = new UserResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'admins';

    // Use the simplified export method
    const data = await this.exportService.exportData(
      users,
      mapper,
      format,
      baseFilename,
      res,
    );

    // Log activity (system-level action, no specific target user)
    await this.activityLogService.log(
      SystemActivityType.DATA_EXPORTED,
      {
        resourceType: 'admin',
        format,
        filename: baseFilename,
        recordCount: users.length,
        filters: {
          search: query.search,
          isActive: query.isActive,
        },
      },
      null,
    );

    return data;
  }
}
