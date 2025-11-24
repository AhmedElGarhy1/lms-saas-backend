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
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { Transactional } from '@nestjs-cls/transactional';
import {
  ApiTags,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
  ApiQuery,
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
import {
  PERMISSIONS,
  PermissionScope,
} from '@/modules/access-control/constants/permissions';
import { RoleResponseDto } from '../dto/role-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { ExportService } from '@/shared/common/services/export.service';
import { RoleResponseExportMapper } from '@/shared/common/mappers/role-response-export.mapper';
import { ExportRolesDto } from '../dto/export-roles.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { ExportFormat } from '@/shared/common/dto';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionService: PermissionService,
    private readonly exportService: ExportService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Get('permissions/me')
  @ReadApiResponses('Get my permissions')
  async getMyPermissions(@GetUser() actor: ActorUser) {
    const result = await this.rolesService.getMyPermissions(actor);
    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.permissionsRetrieved'),
    );
  }

  @Get('permissions')
  @ReadApiResponses('Get permissions')
  @ApiQuery({ name: 'scope', required: false, enum: PermissionScope })
  async getPermissions(
    @Query('scope') scope: PermissionScope,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.permissionService.getPermissions(actor, scope);
    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.dataRetrieved'),
    );
  }

  @Post()
  @CreateApiResponses('Create a new role')
  @ApiBody({ type: CreateRoleRequestDto })
  @Permissions(PERMISSIONS.ROLES.CREATE)
  @Transactional()
  async createRole(
    @Body() dto: CreateRoleRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.rolesService.createRole(dto, actor);

    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.create', {
        args: { resource: this.i18n.translate('t.common.resources.role') },
      }),
    );
  }

  @Get()
  @SerializeOptions({ type: RoleResponseDto })
  @PaginationDocs({
    searchFields: ['name', 'description'],
    filterFields: ['type', 'isActive'],
  })
  async getRoles(
    @Query() query: PaginateRolesDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.rolesService.paginateRoles(query, actor);
    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.dataRetrieved'),
    );
  }

  @Get(':roleId')
  @ReadApiResponses('Get role by ID')
  @ApiParam({ name: 'roleId', type: String })
  // @Permissions(PERMISSIONS.ROLES.VIEW)
  async getRoleById(@Param('roleId', ParseUUIDPipe) roleId: string) {
    const result = await this.rolesService.findById(roleId);
    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.dataRetrieved'),
    );
  }

  @Put(':roleId')
  @UpdateApiResponses('Update a role')
  @ApiParam({ name: 'roleId', type: String })
  @ApiBody({ type: CreateRoleRequestDto })
  @Permissions(PERMISSIONS.ROLES.UPDATE)
  async updateRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: CreateRoleRequestDto,
    @GetUser() user: ActorUser,
  ) {
    const result = await this.rolesService.updateRole(roleId, dto, user);

    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.update', {
        args: { resource: this.i18n.translate('t.common.resources.role') },
      }),
    );
  }

  @Delete(':roleId')
  @DeleteApiResponses('Delete a role')
  @ApiParam({ name: 'roleId', type: String })
  @Permissions(PERMISSIONS.ROLES.DELETE)
  @Transactional()
  async deleteRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetUser() user: ActorUser,
  ) {
    const result = await this.rolesService.deleteRole(roleId, user);

    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.delete', {
        args: { resource: this.i18n.translate('t.common.resources.role') },
      }),
    );
  }

  @Patch(':roleId/restore')
  @UpdateApiResponses('Restore a deleted role')
  @ApiParam({ name: 'roleId', type: String })
  @Permissions(PERMISSIONS.ROLES.RESTORE)
  @Transactional()
  async restoreRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetUser() user: ActorUser,
  ) {
    await this.rolesService.restoreRole(roleId, user);

    return ControllerResponse.message(
      this.i18n.translate('t.success.restore', {
        args: { resource: this.i18n.translate('t.common.resources.role') },
      }),
    );
  }

  // ===== EXPORT FUNCTIONALITY =====
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
    return await this.exportService.exportData(
      roles,
      mapper,
      format,
      baseFilename,
      res,
    );
  }
}
