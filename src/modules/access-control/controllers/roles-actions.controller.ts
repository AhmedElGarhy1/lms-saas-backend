import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {} from '@/shared/common/decorators';
import { RolesService } from '../services/roles.service';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { ExportService } from '@/shared/common/services/export.service';
import { RoleResponseExportMapper } from '@/shared/common/mappers/role-response-export.mapper';
import { ExportRolesDto } from '../dto/export-roles.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';

@ApiTags('Roles')
@Controller('roles/actions')
@ApiBearerAuth()
export class RolesActionsController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly activityLogService: ActivityLogService,
    private readonly exportService: ExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export roles data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.ROLES.VIEW)
  async exportRoles(
    @Query() query: ExportRolesDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format || 'csv';

    // Get data using the same pagination logic
    const paginationResult = await this.rolesService.paginateRoles(
      query,
      actor,
    );
    const roles = paginationResult.items;

    // Create mapper
    const mapper = new RoleResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'roles';

    // Use the simplified export method
    const data = await this.exportService.exportData(
      roles,
      mapper,
      format,
      baseFilename,
      res,
    );
    await this.activityLogService.log(ActivityType.ROLE_EXPORT, {
      userId: actor.id,
      filename: baseFilename,
    });
    return data;
  }
}
