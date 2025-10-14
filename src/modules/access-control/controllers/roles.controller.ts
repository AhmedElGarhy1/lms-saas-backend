import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { RolesService } from '../services/roles.service';
import { PermissionService } from '../services/permission.service';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { PaginationDocs } from '@/shared/common/decorators/pagination-docs.decorator';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { RoleResponseDto } from '../dto/role-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { ExportService } from '@/shared/common/services/export.service';
import { RoleResponseExportMapper } from '@/shared/common/mappers/role-response-export.mapper';
import { ExportRolesDto } from '../dto/export-roles.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionService: PermissionService,
    private readonly activityLogService: ActivityLogService,
    private readonly exportService: ExportService,
  ) {}

  @Get('permissions')
  @ReadApiResponses('Get permissions')
  @ApiParam({ name: 'type', type: String })
  @Permissions(PERMISSIONS.ROLES.VIEW)
  async getPermissions(
    @Param('type') type: 'admin' | 'user' | 'all' = 'all',
    @GetUser() user: ActorUser,
  ) {
    const result = await this.permissionService.getPermissions(type, user);
    return ControllerResponse.success(
      result,
      'Permissions retrieved successfully',
    );
  }

  @Post()
  @CreateApiResponses('Create a new role')
  @ApiBody({ type: CreateRoleRequestDto })
  @Permissions(PERMISSIONS.ROLES.CREATE)
  async createRole(
    @Body() dto: CreateRoleRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.rolesService.createRole(dto, actor);

    // Log role creation
    await this.activityLogService.log(
      ActivityType.ROLE_CREATED,
      {
        roleId: result.id,
        roleName: result.name,
        roleType: result.type,
        permissions: dto.permissions,
        createdBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.success(result, 'Role created successfully');
  }

  @Get()
  @SerializeOptions({ type: RoleResponseDto })
  @PaginationDocs({
    searchFields: ['name', 'description'],
    filterFields: ['type', 'isActive'],
  })
  @Permissions(PERMISSIONS.ROLES.VIEW)
  async getRoles(
    @Query() query: PaginateRolesDto,
    @GetUser() actor: ActorUser,
  ) {
    return this.rolesService.paginateRoles(query, actor);
  }

  @Post('assign')
  @CreateApiResponses('Assign a role to a user')
  @ApiBody({ type: AssignRoleDto })
  @Permissions(PERMISSIONS.ROLES.ASSIGN)
  async assignRole(@Body() dto: AssignRoleDto, @GetUser() user: ActorUser) {
    const result = await this.rolesService.assignRoleValidate(dto, user);
    return ControllerResponse.success(result, 'Role assigned successfully');
  }

  @Delete('assign')
  @DeleteApiResponses('Remove a role from a user')
  @ApiBody({ type: AssignRoleDto })
  @Permissions(PERMISSIONS.ROLES.REMOVE)
  async removeRole(@Body() dto: AssignRoleDto, @GetUser() user: ActorUser) {
    const result = await this.rolesService.removeUserRoleValidate(dto, user);
    return ControllerResponse.success(result, 'Role removed successfully');
  }

  @Get(':roleId')
  @ReadApiResponses('Get role by ID')
  @ApiParam({ name: 'roleId', type: String })
  @Permissions(PERMISSIONS.ROLES.VIEW)
  async getRoleById(@Param('roleId') roleId: string) {
    const result = await this.rolesService.findById(roleId);
    return ControllerResponse.success(result, 'Role retrieved successfully');
  }

  @Put(':roleId')
  @UpdateApiResponses('Update a role')
  @ApiParam({ name: 'roleId', type: String })
  @ApiBody({ type: CreateRoleRequestDto })
  @Permissions(PERMISSIONS.ROLES.UPDATE)
  async updateRole(
    @Param('roleId') roleId: string,
    @Body() dto: CreateRoleRequestDto,
    @GetUser() user: ActorUser,
  ) {
    const result = await this.rolesService.updateRole(roleId, dto, user);

    // Log role update
    await this.activityLogService.log(
      ActivityType.ROLE_UPDATED,
      {
        roleId: roleId,
        roleName: result?.name,
        updatedFields: Object.keys(dto),
        updatedBy: user.id,
      },
      user,
    );

    return ControllerResponse.success(result, 'Role updated successfully');
  }

  @Delete(':roleId')
  @DeleteApiResponses('Delete a role')
  @ApiParam({ name: 'roleId', type: String })
  @Permissions(PERMISSIONS.ROLES.DELETE)
  async deleteRole(
    @Param('roleId') roleId: string,
    @GetUser() user: ActorUser,
  ) {
    const result = await this.rolesService.deleteRole(roleId, user);

    // Log role deletion
    await this.activityLogService.log(
      ActivityType.ROLE_DELETED,
      {
        roleId: roleId,
        deletedBy: user.id,
      },
      user,
    );

    return ControllerResponse.success(result, 'Role deleted successfully');
  }

  @Patch(':roleId/restore')
  @UpdateApiResponses('Restore a deleted role')
  @ApiParam({ name: 'roleId', type: String })
  @Permissions(PERMISSIONS.ROLES.RESTORE)
  async restoreRole(
    @Param('roleId') roleId: string,
    @GetUser() user: ActorUser,
  ) {
    await this.rolesService.restoreRole(roleId, user);

    // Log role restoration
    await this.activityLogService.log(
      ActivityType.ROLE_RESTORED,
      {
        roleId: roleId,
        restoredBy: user.id,
      },
      user,
    );

    return ControllerResponse.message('Role restored successfully');
  }

  // ===== EXPORT FUNCTIONALITY =====
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
    return await this.exportService.exportData(
      roles,
      mapper,
      format,
      baseFilename,
      res,
    );
  }
}
