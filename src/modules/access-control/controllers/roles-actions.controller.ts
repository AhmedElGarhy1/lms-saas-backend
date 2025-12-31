import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Res,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import { Transactional } from '@nestjs-cls/transactional';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
  ApiBody,
} from '@nestjs/swagger';
import { ManagerialOnly } from '@/shared/common/decorators/managerial-only.decorator';
import { RolesService } from '../services/roles.service';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ExportService } from '@/shared/common/services/export.service';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { RoleResponseExportMapper } from '@/shared/common/mappers/role-response-export.mapper';
import { ExportRolesDto } from '../dto/export-roles.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BulkDeleteRolesDto } from '../dto/bulk-delete-roles.dto';
import { BulkRestoreRolesDto } from '../dto/bulk-restore-roles.dto';
import { BulkAssignRoleDto } from '../dto/bulk-assign-role.dto';
import { BulkRemoveRoleDto } from '../dto/bulk-remove-role.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { RoleEvents } from '@/shared/events/role.events.enum';
import { RoleExportedEvent } from '../events/role.events';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiTags('Roles')
@Controller('roles/actions')
@ApiBearerAuth()
@ManagerialOnly()
export class RolesActionsController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly exportService: ExportService,
    private readonly bulkOperationService: BulkOperationService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export roles data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.ROLES.EXPORT)
  async exportRoles(
    @Query() query: ExportRolesDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format;

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

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      RoleEvents.EXPORTED,
      new RoleExportedEvent(format, baseFilename, roles.length, query, actor),
    );

    return data;
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete roles' })
  @ApiBody({ type: BulkDeleteRolesDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.ROLES.DELETE)
  @Transactional()
  async bulkDelete(
    @Body() dto: BulkDeleteRolesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.roleIds,
      async (roleId: string) => {
        await this.rolesService.deleteRole(roleId, actor);
        return { id: roleId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.role',
      },
    });
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore deleted roles' })
  @ApiBody({ type: BulkRestoreRolesDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.ROLES.RESTORE)
  @Transactional()
  async bulkRestore(
    @Body() dto: BulkRestoreRolesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.roleIds,
      async (roleId: string) => {
        await this.rolesService.restoreRole(roleId, actor);
        return { id: roleId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.role',
      },
    });
  }

  @Post('bulk/assign')
  @ApiOperation({ summary: 'Bulk assign role to multiple users' })
  @ApiBody({ type: BulkAssignRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk assign completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.ROLES.ASSIGN)
  @Transactional()
  async bulkAssign(
    @Body() dto: BulkAssignRoleDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        const assignDto: AssignRoleDto = {
          roleId: dto.roleId,
          userProfileId,
          centerId: dto.centerId,
        };
        await this.rolesService.assignRoleValidate(assignDto, actor);
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.role',
      },
    });
  }

  @Delete('bulk/remove')
  @ApiOperation({ summary: 'Bulk remove role from multiple users' })
  @ApiBody({ type: BulkRemoveRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk remove completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.ROLES.ASSIGN)
  @Transactional()
  async bulkRemove(
    @Body() dto: BulkRemoveRoleDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        const removeDto: AssignRoleDto = {
          roleId: dto.roleId,
          userProfileId,
          centerId: dto.centerId,
        };
        await this.rolesService.removeUserRoleValidate(removeDto, actor);
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.role',
      },
    });
  }
}
