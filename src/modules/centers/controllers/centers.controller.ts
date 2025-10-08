import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { SerializeOptions, Query } from '@nestjs/common';
import { PaginateCentersDto } from '../dto/paginate-centers.dto';

import { CentersService } from '../services/centers.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';

import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { CreateCenterRequestDto } from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import { CenterResponseDto } from '../dto/center-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Scope, ScopeType } from '@/shared/common/decorators';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { GrantGlobalAccessDto } from '@/modules/access-control/dto/grant-global-access.dto';
import { RevokeGlobalAccessDto } from '@/modules/access-control/dto/revoke-global-access.dto';

@Controller('centers')
@ApiTags('Centers')
@ApiBearerAuth()
export class CentersController {
  constructor(
    private readonly centersService: CentersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Post('access')
  @ApiOperation({ summary: 'Grant global access to a user for this center' })
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: GrantGlobalAccessDto })
  @ApiResponse({
    status: 201,
    description: 'Global access granted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Center not found' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.GRANT.action)
  @Scope(ScopeType.ADMIN)
  async grantGlobalAccess(
    @Body() dto: GrantGlobalAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    return this.accessControlService.grantGlobalAccess(dto, actor.id);
  }

  @Delete('access')
  @ApiOperation({ summary: 'Revoke global access from a user for this center' })
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: RevokeGlobalAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Global access revoked successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Center not found' })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.REVOKE.action)
  @Scope(ScopeType.ADMIN)
  async revokeGlobalAccess(
    @Body() dto: RevokeGlobalAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    // Override centerId from URL parameter

    return this.accessControlService.revokeGlobalAccess(dto, actor.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new center' })
  @ApiBody({ type: CreateCenterRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Center created successfully',
    type: CenterResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(PERMISSIONS.CENTER.CREATE.action)
  createCenter(
    @Body() dto: CreateCenterRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    return this.centersService.createCenter(dto, actor.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List centers with pagination, search, and filtering',
    description:
      'Retrieve a paginated list of centers with comprehensive search, sort, and filter capabilities. Supports searching by name, description, city, state, country. Filter by status. Sort by name, status, enrollment, creation date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Centers retrieved successfully',
    type: [CenterResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @SerializeOptions({ type: CenterResponseDto })
  @Scope(ScopeType.ADMIN)
  listCenters(@Query() query: PaginateCentersDto, @GetUser() actor: ActorUser) {
    return this.centersService.paginateCenters(query, actor.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get center by ID' })
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Center retrieved successfully',
    type: CenterResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Center not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(PERMISSIONS.CENTER.VIEW.action)
  getCenterById(@Param('id') id: string) {
    return this.centersService.findCenterById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update center' })
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: UpdateCenterRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Center updated successfully',
    type: CenterResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Center not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(PERMISSIONS.CENTER.UPDATE.action)
  updateCenter(
    @Param('id') id: string,
    @Body() dto: UpdateCenterRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    return this.centersService.updateCenter(id, dto, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete center (soft delete)' })
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiResponse({ status: 200, description: 'Center deleted successfully' })
  @ApiResponse({ status: 404, description: 'Center not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(PERMISSIONS.CENTER.DELETE.action)
  async deleteCenter(@Param('id') id: string, @GetUser() actor: ActorUser) {
    await this.centersService.deleteCenter(id, actor.id);
    return { message: 'Center deleted successfully' };
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore deleted center' })
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiResponse({ status: 200, description: 'Center restored successfully' })
  @ApiResponse({ status: 404, description: 'Center not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(PERMISSIONS.CENTER.RESTORE.action)
  async restoreCenter(@Param('id') id: string, @GetUser() actor: ActorUser) {
    await this.centersService.restoreCenter(id, actor.id);
    return { message: 'Center restored successfully' };
  }
}
