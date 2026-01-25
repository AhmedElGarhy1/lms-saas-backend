import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AdminService } from '../services/admin.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ExportService } from '@/shared/common/services/export.service';
import { UserResponseExportMapper } from '@/shared/common/mappers/user-response-export.mapper';
import { ExportUsersDto } from '@/modules/user/dto/export-users.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { AdminOnly } from '@/shared/common/decorators';

@ApiTags('Admin Actions')
@Controller('admin/actions')
@AdminOnly()
export class AdminActionsController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exportService: ExportService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
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
    const data = this.exportService.exportData(
      users,
      mapper,
      format,
      baseFilename,
      res,
    );

    return data;
  }
}
