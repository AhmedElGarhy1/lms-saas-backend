import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators/api-responses.decorator';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions, Query } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { PaginateCentersDto } from '../dto/paginate-centers.dto';
import { CentersService } from '../services/centers.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { CreateCenterDto } from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import { CenterResponseDto } from '../dto/center-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { CenterIdParamDto } from '../dto/center-id-param.dto';
import { ManagerialOnly } from '@/shared/common/decorators/managerial-only.decorator';

@Controller('centers')
@ApiTags('Centers')
@ApiBearerAuth()
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Post()
  @CreateApiResponses('Create a new center')
  @ApiBody({ type: CreateCenterDto })
  @Permissions(PERMISSIONS.CENTER.CREATE)
  @Transactional()
  @ManagerialOnly()
  async createCenter(
    @Body() dto: CreateCenterDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.centersService.createCenter(dto, actor);

    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.center' },
    });
  }

  @Get()
  @ReadApiResponses('List centers with pagination, search, and filtering')
  @SerializeOptions({ type: CenterResponseDto })
  async listCenters(
    @Query() query: PaginateCentersDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.centersService.paginateCenters(query, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.center' },
    });
  }

  @Get(':id')
  @ReadApiResponses('Get center by ID')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ManagerialOnly()
  async getCenterById(
    @Param() params: CenterIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.centersService.findCenterById(
      params.id,
      actor,
      true,
    ); // includeDeleted: true for API endpoints
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.center' },
    });
  }

  @Put(':id')
  @UpdateApiResponses('Update center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: UpdateCenterRequestDto })
  @Permissions(PERMISSIONS.CENTER.UPDATE)
  @Transactional()
  @ManagerialOnly()
  async updateCenter(
    @Param() params: CenterIdParamDto,
    @Body() dto: UpdateCenterRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.centersService.updateCenter(
      params.id,
      dto,
      actor,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.center' },
    });
  }

  @Delete(':id')
  @DeleteApiResponses('Delete center (soft delete)')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @Permissions(PERMISSIONS.CENTER.DELETE)
  @Transactional()
  @ManagerialOnly()
  async deleteCenter(
    @Param() params: CenterIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.centersService.deleteCenter(params.id, actor);

    return ControllerResponse.message({
      key: 't.messages.deleted',
      args: { resource: 't.resources.center' },
    });
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore deleted center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @Permissions(PERMISSIONS.CENTER.RESTORE)
  @Transactional()
  @ManagerialOnly()
  async restoreCenter(
    @Param() params: CenterIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.centersService.restoreCenter(params.id, actor);

    return ControllerResponse.message({
      key: 't.messages.restored',
      args: { resource: 't.resources.center' },
    });
  }

  @Patch(':id/status')
  @UpdateApiResponses('Toggle center active status')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({
    schema: { type: 'object', properties: { isActive: { type: 'boolean' } } },
  })
  @Permissions(PERMISSIONS.CENTER.ACTIVATE)
  @Transactional()
  @ManagerialOnly()
  async toggleCenterStatus(
    @Param() params: CenterIdParamDto,
    @Body() body: { isActive: boolean },
    @GetUser() actor: ActorUser,
  ) {
    await this.centersService.toggleCenterStatus(
      params.id,
      body.isActive,
      actor,
    );

    return ControllerResponse.message({
      key: 't.messages.updated',
      args: { resource: 't.resources.center' },
    });
  }
}
