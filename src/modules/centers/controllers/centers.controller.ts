import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
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
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { ExportService } from '@/shared/common/services/export.service';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';

@Controller('centers')
@ApiTags('Centers')
@ApiBearerAuth()
export class CentersController {
  constructor(
    private readonly centersService: CentersService,
    private readonly accessControlService: AccessControlService,
    private readonly exportService: ExportService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Post()
  @CreateApiResponses('Create a new center')
  @ApiBody({ type: CreateCenterDto })
  @Permissions(PERMISSIONS.CENTER.CREATE)
  @Transactional()
  async createCenter(
    @Body() dto: CreateCenterDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.centersService.createCenter(dto, actor);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.create', {
        args: {
          resource: this.i18n.translate('common.resources.center'),
        },
      }),
    );
  }

  @Get()
  @ReadApiResponses('List centers with pagination, search, and filtering')
  @SerializeOptions({ type: CenterResponseDto })
  @NoContext()
  listCenters(@Query() query: PaginateCentersDto, @GetUser() actor: ActorUser) {
    return this.centersService.paginateCenters(query, actor);
  }

  @Get(':id')
  @ReadApiResponses('Get center by ID')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  async getCenterById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.centersService.findCenterById(id);
    return ControllerResponse.success(
      result,
      this.i18n.translate('api.success.dataRetrieved'),
    );
  }

  @Put(':id')
  @UpdateApiResponses('Update center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: UpdateCenterRequestDto })
  @Permissions(PERMISSIONS.CENTER.UPDATE)
  async updateCenter(
    @Param('id') id: string,
    @Body() dto: UpdateCenterRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.centersService.updateCenter(id, dto, actor);

    return ControllerResponse.success(
      result,
      this.i18n.translate('success.update', {
        args: {
          resource: this.i18n.translate('common.resources.center'),
        },
      }),
    );
  }

  @Delete(':id')
  @DeleteApiResponses('Delete center (soft delete)')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @Permissions(PERMISSIONS.CENTER.DELETE)
  async deleteCenter(@Param('id') id: string, @GetUser() actor: ActorUser) {
    await this.centersService.deleteCenter(id, actor);

    return ControllerResponse.message(
      this.i18n.translate('success.delete', {
        args: {
          resource: this.i18n.translate('common.resources.center'),
        },
      }),
    );
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore deleted center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @Permissions(PERMISSIONS.CENTER.RESTORE)
  async restoreCenter(@Param('id') id: string, @GetUser() actor: ActorUser) {
    await this.centersService.restoreCenter(id, actor);

    return ControllerResponse.message('Center restored successfully');
  }

  @Patch(':id/status')
  @UpdateApiResponses('Toggle center active status')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({
    schema: { type: 'object', properties: { isActive: { type: 'boolean' } } },
  })
  @Permissions(PERMISSIONS.CENTER.UPDATE)
  @Transactional()
  async toggleCenterStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive: boolean },
    @GetUser() actor: ActorUser,
  ) {
    await this.centersService.toggleCenterStatus(id, body.isActive, actor);

    return ControllerResponse.message(
      this.i18n.translate('success.update', {
        args: { resource: this.i18n.translate('common.resources.center') },
      }),
    );
  }
}
