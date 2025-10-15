import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserService } from '../services/user.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ExportService } from '@/shared/common/services/export.service';
import { UserResponseExportMapper } from '@/shared/common/mappers/user-response-export.mapper';
import { ExportUsersDto } from '../dto/export-users.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { PermissionScope } from '@/modules/access-control/constants/permissions';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';

@ApiTags('User Actions')
@Controller('users/actions')
export class UserActionsController {
  constructor(
    private readonly userService: UserService,
    private readonly activityLogService: ActivityLogService,
    private readonly exportService: ExportService,
  ) {}

  // ===== EXPORT FUNCTIONALITY =====
  @Get('export')
  @ApiOperation({ summary: 'Export users data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.USER.EXPORT, PermissionScope.CENTER)
  async exportUsers(
    @Query() query: ExportUsersDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format || 'csv';

    // Get data using the same pagination logic
    const paginationResult = await this.userService.paginateUsers(query, actor);
    const users = paginationResult.items;

    // Create mapper
    const mapper = new UserResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'users';

    // Use the simplified export method
    const data = await this.exportService.exportData(
      users,
      mapper,
      format,
      baseFilename,
      res,
    );
    await this.activityLogService.log(ActivityType.USER_EXPORT, {
      userId: actor.id,
      filename: baseFilename,
    });
    return data;
  }

  @Get('admin/export')
  @ApiOperation({ summary: 'Export admin users data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.USER.EXPORT, PermissionScope.ADMIN)
  async exportAdminUsers(
    @Query() query: ExportUsersDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const paginationResult = await this.userService.paginateAdmins(
      query,
      actor,
    );
    const users = paginationResult.items;

    // Create mapper
    const mapper = new UserResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'admins';

    const format = query.format || 'csv';

    // Use the simplified export method
    const data = await this.exportService.exportData(
      users,
      mapper,
      format,
      baseFilename,
      res,
    );
    await this.activityLogService.log(ActivityType.USER_ADMIN_EXPORT, {
      userId: actor.id,
      filename: baseFilename,
    });
    return data;
  }
}
