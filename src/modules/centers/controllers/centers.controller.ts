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
import { SerializeOptions } from '@nestjs/common';
import { Paginate } from '@/shared/common/decorators/pagination.decorator';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { PaginationDocs } from '@/shared/common/decorators/pagination-docs.decorator';

import { CentersService } from '../services/centers.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '@/shared/common/types/current-user.type';

import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { CreateCenterRequestDto } from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import { CenterResponseDto } from '../dto/center-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@Controller('centers')
@ApiTags('Centers')
@ApiBearerAuth()
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

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
    @GetUser() user: CurrentUserType,
  ) {
    return this.centersService.createCenter(dto, user.id);
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
  @SerializeOptions({ type: CenterResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @PaginationDocs({
    searchFields: ['name', 'description', 'city', 'state', 'country'],
    filterFields: ['status'],
  })
  @Permissions(PERMISSIONS.CENTER.VIEW.action)
  @SerializeOptions({ type: CenterResponseDto })
  listCenters(
    @Paginate() query: PaginationQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.centersService.listCenters(query, user.id);
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
    @GetUser() user: CurrentUserType,
  ) {
    return this.centersService.updateCenter(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete center (soft delete)' })
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiResponse({ status: 200, description: 'Center deleted successfully' })
  @ApiResponse({ status: 404, description: 'Center not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(PERMISSIONS.CENTER.DELETE.action)
  async deleteCenter(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ) {
    await this.centersService.deleteCenter(id, user.id);
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
  async restoreCenter(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ) {
    await this.centersService.restoreCenter(id, user.id);
    return { message: 'Center restored successfully' };
  }
}
