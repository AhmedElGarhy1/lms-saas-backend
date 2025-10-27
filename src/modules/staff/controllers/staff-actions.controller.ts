import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { StaffService } from '../services/staff.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { ExportService } from '@/shared/common/services/export.service';
import { UserResponseExportMapper } from '@/shared/common/mappers/user-response-export.mapper';
import { ExportUsersDto } from '@/modules/user/dto/export-users.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';

@ApiTags('Staff Actions')
@Controller('staff/actions')
export class StaffActionsController {
  constructor(
    private readonly staffService: StaffService,
    private readonly i18n: I18nService<I18nTranslations>,
    private readonly exportService: ExportService,
  ) {}

  // ===== EXPORT FUNCTIONALITY =====
  @Get('export')
  @ApiOperation({ summary: 'Export staff data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.STAFF.EXPORT)
  async exportStaff(
    @Query() query: ExportUsersDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format;

    // Get data using staff pagination logic
    const paginationResult = await this.staffService.paginateStaff(
      query,
      actor,
    );
    const users = paginationResult.items;

    // Create mapper
    const mapper = new UserResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'staff';

    // Use the simplified export method
    const data = await this.exportService.exportData(
      users,
      mapper,
      format,
      baseFilename,
      res,
    );
    return data;
  }
}
