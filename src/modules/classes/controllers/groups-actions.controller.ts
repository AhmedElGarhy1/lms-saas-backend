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
import { GroupsService } from '../services/groups.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkDeleteGroupsDto } from '../dto/bulk-delete-groups.dto';
import { BulkRestoreGroupsDto } from '../dto/bulk-restore-groups.dto';
import { BulkAssignStudentsToGroupDto } from '../dto/bulk-assign-students-to-group.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ExportService } from '@/shared/common/services/export.service';
import { GroupExportMapper } from '../mappers/group-export.mapper';
import { ExportGroupsDto } from '../dto/export-groups.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import { GroupExportedEvent } from '../events/group.events';

@ApiBearerAuth()
@ApiTags('Groups Actions')
@Controller('groups/actions')
export class GroupsActionsController {
  @Get('export')
  @ApiOperation({ summary: 'Export groups data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.GROUPS.READ)
  async exportGroups(
    @Query() query: ExportGroupsDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format;

    // Get data using the same pagination logic
    const paginationResult = await this.groupsService.paginateGroups(
      query,
      actor,
    );
    const groups = paginationResult.items;

    // Create mapper
    const mapper = new GroupExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'groups';

    // Use the simplified export method
    const data = this.exportService.exportData(
      groups,
      mapper,
      format,
      baseFilename,
      res,
    );

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.EXPORTED,
      new GroupExportedEvent(format, baseFilename, groups.length, query, actor),
    );

    return data;
  }
  constructor(
    private readonly groupsService: GroupsService,
    private readonly bulkOperationService: BulkOperationService,
    private readonly exportService: ExportService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete groups' })
  @ApiBody({ type: BulkDeleteGroupsDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.GROUPS.DELETE)
  @Transactional()
  async bulkDelete(
    @Body() dto: BulkDeleteGroupsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.groupIds,
      async (groupId: string) => {
        await this.groupsService.deleteGroup(groupId, actor);
        return { id: groupId };
      },
    );

    return ControllerResponse.success(result, 't.success.bulkDelete', {
      resource: 't.common.resources.group',
    });
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore deleted groups' })
  @ApiBody({ type: BulkRestoreGroupsDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.GROUPS.RESTORE)
  @Transactional()
  async bulkRestore(
    @Body() dto: BulkRestoreGroupsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.groupIds,
      async (groupId: string) => {
        await this.groupsService.restoreGroup(groupId, actor);
        return { id: groupId };
      },
    );

    return ControllerResponse.success(result, 't.success.bulkRestore', {
      resource: 't.common.resources.group',
    });
  }

  @Post('bulk/assign-students')
  @ApiOperation({ summary: 'Bulk assign students to a group' })
  @ApiBody({ type: BulkAssignStudentsToGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk assignment completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.GROUPS.UPDATE)
  @Transactional()
  async bulkAssignStudentsToGroup(
    @Body() dto: BulkAssignStudentsToGroupDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.groupsService.bulkAssignStudentsToGroup(
      dto.groupId,
      dto.userProfileIds,
      actor,
    );
    return ControllerResponse.success(
      result,
      't.success.bulkAssignStudentsToGroup',
    );
  }
}
