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
import { PaginateCentersDto } from '../dto/paginate-centers.dto';

import { CentersService } from '../services/centers.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';

import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { CreateCenterDto } from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import { CenterResponseDto } from '../dto/center-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Scope, ScopeType } from '@/shared/common/decorators';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { CenterAccessDto } from '@/modules/access-control/dto/center-access.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';

@Controller('centers')
@ApiTags('Centers')
@ApiBearerAuth()
export class CentersController {
  constructor(
    private readonly centersService: CentersService,
    private readonly accessControlService: AccessControlService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post('access')
  @CreateApiResponses('Grant center access to a user for this center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: CenterAccessDto })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.GRANT.action)
  @Scope(ScopeType.ADMIN)
  async grantCenterAccess(
    @Body() dto: CenterAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.grantCenterAccess(
      dto,
      actor,
    );

    // Log center access granted
    await this.activityLogService.log(
      ActivityType.CENTER_ACCESS_GRANTED,
      {
        centerId: dto.centerId,
        targetUserId: dto.userId,
        grantedBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.success(
      result,
      'Center access granted successfully',
    );
  }

  @Delete('access')
  @DeleteApiResponses('Revoke center access from a user for this center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: CenterAccessDto })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.REVOKE.action)
  @Scope(ScopeType.ADMIN)
  async revokeCenterAccess(
    @Body() dto: CenterAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.revokeCenterAccess(
      dto,
      actor,
    );

    // Log center access revoked
    await this.activityLogService.log(
      ActivityType.CENTER_ACCESS_REVOKED,
      {
        centerId: dto.centerId,
        targetUserId: dto.userId,
        revokedBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.success(
      result,
      'Center access revoked successfully',
    );
  }

  @Post()
  @CreateApiResponses('Create a new center')
  @ApiBody({ type: CreateCenterDto })
  @Permissions(PERMISSIONS.CENTER.CREATE.action)
  async createCenter(
    @Body() dto: CreateCenterDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.centersService.createCenter(dto, actor);

    // Log center creation
    await this.activityLogService.log(
      ActivityType.CENTER_CREATED,
      {
        centerId: result.id,
        centerName: result.name,
        createdBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.success(result, 'Center created successfully');
  }

  @Get()
  @ReadApiResponses('List centers with pagination, search, and filtering')
  @SerializeOptions({ type: CenterResponseDto })
  @Scope(ScopeType.ADMIN)
  listCenters(@Query() query: PaginateCentersDto, @GetUser() actor: ActorUser) {
    return this.centersService.paginateCenters(query, actor.id);
  }

  @Get(':id')
  @ReadApiResponses('Get center by ID')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @Permissions(PERMISSIONS.CENTER.VIEW.action)
  async getCenterById(@Param('id') id: string) {
    const result = await this.centersService.findCenterById(id);
    return ControllerResponse.success(result, 'Center retrieved successfully');
  }

  @Put(':id')
  @UpdateApiResponses('Update center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: UpdateCenterRequestDto })
  @Permissions(PERMISSIONS.CENTER.UPDATE.action)
  async updateCenter(
    @Param('id') id: string,
    @Body() dto: UpdateCenterRequestDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.centersService.updateCenter(id, dto, actor.id);

    // Log center update
    await this.activityLogService.log(
      ActivityType.CENTER_UPDATED,
      {
        centerId: id,
        centerName: result.name,
        updatedFields: Object.keys(dto),
        updatedBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.success(result, 'Center updated successfully');
  }

  @Delete(':id')
  @DeleteApiResponses('Delete center (soft delete)')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @Permissions(PERMISSIONS.CENTER.DELETE.action)
  async deleteCenter(@Param('id') id: string, @GetUser() actor: ActorUser) {
    await this.centersService.deleteCenter(id, actor.id);

    // Log center deletion
    await this.activityLogService.log(
      ActivityType.CENTER_DELETED,
      {
        centerId: id,
        deletedBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.message('Center deleted successfully');
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore deleted center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @Permissions(PERMISSIONS.CENTER.RESTORE.action)
  async restoreCenter(@Param('id') id: string, @GetUser() actor: ActorUser) {
    await this.centersService.restoreCenter(id, actor.id);

    // Log center restoration
    await this.activityLogService.log(
      ActivityType.CENTER_RESTORED,
      {
        centerId: id,
        restoredBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.message('Center restored successfully');
  }
}
