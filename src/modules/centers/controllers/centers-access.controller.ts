import { Controller, Post, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators/api-responses.decorator';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { CenterAccessDto } from '@/modules/access-control/dto/center-access.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';

@ApiBearerAuth()
@ApiTags('Centers Access')
@Controller('centers/access')
export class CentersAccessController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  @CreateApiResponses('Grant center access to a user for this center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: CenterAccessDto })
  @Permissions(PERMISSIONS.CENTER.GRANT_ACCESS)
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

  @Delete()
  @DeleteApiResponses('Revoke center access from a user for this center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: CenterAccessDto })
  @Permissions(PERMISSIONS.CENTER.GRANT_ACCESS)
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
}
