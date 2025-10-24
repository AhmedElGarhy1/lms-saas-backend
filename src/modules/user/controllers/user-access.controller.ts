import { Controller, Post, Body, Delete } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';

@ApiTags('User Access')
@Controller('users/access')
export class UserAccessController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  @CreateApiResponses('Grant user access to another user')
  @ApiBody({ type: UserAccessDto })
  @Permissions(PERMISSIONS.USER.GRANT_ACCESS)
  @Transactional()
  async grantUserAccess(
    @Body() dto: UserAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.grantUserAccessValidate(
      dto,
      actor,
    );

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_ACCESS_GRANTED,
      {
        targetUserProfileId: dto.targetUserProfileId,
        grantedBy: actor.userProfileId,
        centerId: dto.centerId,
      },
      actor,
    );

    return result;
  }

  @Delete()
  @DeleteApiResponses('Revoke user access to another user')
  @ApiBody({ type: UserAccessDto })
  @Permissions(PERMISSIONS.USER.GRANT_ACCESS)
  @Transactional()
  async revokeUserAccess(
    @Body() dto: UserAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.revokeUserAccessValidate(
      dto,
      actor,
    );

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_ACCESS_REVOKED,
      {
        targetUserProfileId: dto.targetUserProfileId,
        revokedBy: actor.userProfileId,
        centerId: dto.centerId,
      },
      actor,
    );

    return result;
  }
}
