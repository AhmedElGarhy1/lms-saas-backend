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
import { GroupStudentService } from '../services/group-student.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BulkDeleteGroupsDto } from '../dto/bulk-delete-groups.dto';
import { BulkRestoreGroupsDto } from '../dto/bulk-restore-groups.dto';
import { BulkAssignStudentsToGroupDto } from '../dto/bulk-assign-students-to-group.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ExportService } from '@/shared/common/services/export.service';
import { GroupExportMapper } from '@/shared/common/mappers/group-export.mapper';
import { ExportGroupsDto } from '../dto/export-groups.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { ClassesRepository } from '../repositories/classes.repository';
import { BranchesRepository } from '@/modules/centers/repositories/branches.repository';
import { Class } from '../entities/class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Group } from '../entities/group.entity';
import { ExportMapper } from '@/shared/common/services/export.service';
import { ManagerialOnly } from '@/shared/common/decorators';

@ApiBearerAuth()
@ApiTags('Groups Actions')
@Controller('groups/actions')
@ManagerialOnly()
export class GroupsActionsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly groupStudentService: GroupStudentService,
    private readonly exportService: ExportService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly classesRepository: ClassesRepository,
    private readonly branchesRepository: BranchesRepository,
  ) {}

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

    // Fetch class and branch data separately instead of relying on relations
    const classIds = [...new Set(groups.map((g) => g.classId))];
    const branchIds = [...new Set(groups.map((g) => g.branchId))];

    const classes = await Promise.all(
      classIds.map((id) => this.classesRepository.findOne(id)),
    );
    const branches = await Promise.all(
      branchIds.map((id) => this.branchesRepository.findOne(id)),
    );

    // Create maps for quick lookup
    const classMap = new Map<string, Class | null>();
    classes.forEach((classEntity) => {
      if (classEntity) {
        classMap.set(classEntity.id, classEntity);
      }
    });

    const branchMap = new Map<string, Branch | null>();
    branches.forEach((branch) => {
      if (branch) {
        branchMap.set(branch.id, branch);
      }
    });

    // Create mapper with access to class and branch data
    const baseMapper = new GroupExportMapper();
    const mapper: ExportMapper<
      Group,
      ReturnType<GroupExportMapper['mapToExport']>
    > = {
      mapToExport: (group: Group) => {
        const classEntity = classMap.get(group.classId) || undefined;
        const branch = branchMap.get(group.branchId) || undefined;
        return baseMapper.mapToExportWithContext(group, classEntity, branch);
      },
      getHeaders: () => baseMapper.getHeaders(),
    };

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

    return data;
  }

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
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.groupsService.bulkDeleteGroups(
      dto.groupIds,
      actor,
    );

    return ControllerResponse.success(result);
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
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.groupsService.bulkRestoreGroups(
      dto.groupIds,
      actor,
    );

    return ControllerResponse.success(result);
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
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.groupStudentService.bulkAssignStudentsToGroup(
      dto.groupId,
      dto.userProfileIds,
      actor,
      dto.skipWarning,
    );
    return ControllerResponse.success(result);
  }
}
