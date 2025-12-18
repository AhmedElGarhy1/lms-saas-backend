import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Transactional } from '@nestjs-cls/transactional';
import { ClassesService } from '../services/classes.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BulkDeleteClassesDto } from '../dto/bulk-delete-classes.dto';
import { BulkRestoreClassesDto } from '../dto/bulk-restore-classes.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ExportService } from '@/shared/common/services/export.service';
import { ClassExportMapper } from '@/shared/common/mappers/class-export.mapper';
import { ExportClassesDto } from '../dto/export-classes.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import { ClassExportedEvent } from '../events/class.events';

@ApiBearerAuth()
@ApiTags('Classes Actions')
@Controller('classes/actions')
export class ClassesActionsController {
  @Get('export')
  @ApiOperation({ summary: 'Export classes data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.CLASSES.EXPORT)
  async exportClasses(
    @Query() query: ExportClassesDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format;

    // Get data using the same pagination logic
    const paginationResult = await this.classesService.paginateClasses(
      query,
      actor,
    );
    const classes = paginationResult.items;

    // Create mapper
    const mapper = new ClassExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'classes';

    // Use the simplified export method
    const data = this.exportService.exportData(
      classes,
      mapper,
      format,
      baseFilename,
      res,
    );

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.EXPORTED,
      new ClassExportedEvent(
        format,
        baseFilename,
        classes.length,
        query,
        actor,
      ),
    );

    return data;
  }
  constructor(
    private readonly classesService: ClassesService,
    private readonly exportService: ExportService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete classes' })
  @ApiBody({ type: BulkDeleteClassesDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.CLASSES.DELETE)
  @Transactional()
  async bulkDelete(
    @Body() dto: BulkDeleteClassesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.classesService.bulkDeleteClasses(
      dto.classIds,
      actor,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.class',
      },
    });
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore deleted classes' })
  @ApiBody({ type: BulkRestoreClassesDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.CLASSES.RESTORE)
  @Transactional()
  async bulkRestore(
    @Body() dto: BulkRestoreClassesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.classesService.bulkRestoreClasses(
      dto.classIds,
      actor,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.class',
      },
    });
  }
}
