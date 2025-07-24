import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import {
  GuardiansService,
  CreateGuardianDto,
  UpdateGuardianDto,
} from './guardians.service';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser } from '../shared/types/current-user.type';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { PaginationDocs } from '../shared/decorators/pagination-docs.decorator';

@ApiTags('Guardians')
@Controller('guardians')
@UseGuards(PermissionsGuard)
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Post()
  @Permissions('guardian:create')
  @ApiOperation({ summary: 'Create a new guardian' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        userId: { type: 'string' },
      },
      required: ['name'],
    },
  })
  @ApiResponse({ status: 201, description: 'Guardian created successfully' })
  async create(@Body() dto: CreateGuardianDto) {
    return this.guardiansService.createGuardian(dto);
  }

  @Get()
  @PaginationDocs({
    searchFields: ['name', 'email'],
  })
  @Permissions('guardian:view')
  @ApiOperation({ summary: 'List guardians' })
  @ApiResponse({
    status: 200,
    description: 'List of guardians',
  })
  async listGuardians(
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUser,
  ) {
    return this.guardiansService.listGuardians(query, user.id);
  }

  @Get(':id')
  @Permissions('guardian:view')
  @ApiOperation({ summary: 'Get guardian by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Guardian details' })
  async getGuardian(@Param('id') id: string) {
    return this.guardiansService.getGuardian(id);
  }

  @Put(':id')
  @Permissions('guardian:update')
  @ApiOperation({ summary: 'Update guardian' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Guardian updated successfully' })
  async updateGuardian(
    @Param('id') id: string,
    @Body() dto: UpdateGuardianDto,
  ) {
    return this.guardiansService.updateGuardian(id, dto);
  }

  @Delete(':id')
  @Permissions('guardian:delete')
  @ApiOperation({ summary: 'Delete guardian' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Guardian deleted successfully' })
  async deleteGuardian(@Param('id') id: string) {
    return this.guardiansService.deleteGuardian(id);
  }
}
