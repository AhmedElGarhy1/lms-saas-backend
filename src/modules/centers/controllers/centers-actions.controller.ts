import { Controller, Get, Res, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Transactional } from '@nestjs-cls/transactional';
import {} from '@/shared/common/decorators/api-responses.decorator';
import { Query } from '@nestjs/common';
import { CentersService } from '../services/centers.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ExportService } from '@/shared/common/services/export.service';
import { CenterResponseExportMapper } from '@/shared/common/mappers/center-response-export.mapper';
import { ExportCentersDto } from '../dto/export-centers.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { CenterExportedEvent } from '../events/center.events';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkDeleteCentersDto } from '../dto/bulk-delete-centers.dto';
import { BulkRestoreCentersDto } from '../dto/bulk-restore-centers.dto';
import { BulkToggleCenterStatusDto } from '../dto/bulk-toggle-center-status.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiBearerAuth()
@ApiTags('Centers Actions')
@Controller('centers/actions')
export class CentersActionsController {
  constructor(
    private readonly centersService: CentersService,
    private readonly exportService: ExportService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly bulkOperationService: BulkOperationService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export centers data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.CENTER.EXPORT)
  async exportCenters(
    @Query() query: ExportCentersDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format;

    // Get data using the same pagination logic
    const paginationResult = await this.centersService.paginateCenters(
      query,
      actor,
    );
    const centers = paginationResult.items;

    // Create mapper
    const mapper = new CenterResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'centers';

    // Use the simplified export method
    const data = this.exportService.exportData(
      centers,
      mapper,
      format,
      baseFilename,
      res,
    );

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.EXPORTED,
      new CenterExportedEvent(
        format,
        baseFilename,
        centers.length,
        query,
        actor,
      ),
    );

    return data;
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete centers' })
  @ApiBody({ type: BulkDeleteCentersDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.CENTER.DELETE)
  @Transactional()
  async bulkDelete(
    @Body() dto: BulkDeleteCentersDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.centerIds,
      async (centerId: string) => {
        await this.centersService.deleteCenter(centerId, actor);
        return { id: centerId };
      },
    );

    return ControllerResponse.success(result, 't.success.bulkDelete', {
      resource: 't.common.resources.center',
    });
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore deleted centers' })
  @ApiBody({ type: BulkRestoreCentersDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.CENTER.RESTORE)
  @Transactional()
  async bulkRestore(
    @Body() dto: BulkRestoreCentersDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.centerIds,
      async (centerId: string) => {
        await this.centersService.restoreCenter(centerId, actor);
        return { id: centerId };
      },
    );

    return ControllerResponse.success(result, 't.success.bulkRestore', {
      resource: 't.common.resources.center',
    });
  }

  @Post('bulk/status')
  @ApiOperation({ summary: 'Bulk toggle center active status' })
  @ApiBody({ type: BulkToggleCenterStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk status toggle completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.CENTER.ACTIVATE)
  @Transactional()
  async bulkToggleStatus(
    @Body() dto: BulkToggleCenterStatusDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.centerIds,
      async (centerId: string) => {
        await this.centersService.toggleCenterStatus(
          centerId,
          dto.isActive,
          actor,
        );
        return { id: centerId };
      },
    );

    return ControllerResponse.success(result, 't.success.update', {
      resource: 't.common.resources.center',
    });
  }
}
