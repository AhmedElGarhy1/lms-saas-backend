import { Controller, Post, Body, Delete } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  BusinessLogicException,
  InsufficientPermissionsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@ApiTags('User Access')
@Controller('users/access')
export class UserAccessController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  @Post()
  @CreateApiResponses('Grant user access to another user')
  @ApiBody({ type: UserAccessDto })
  @Transactional()
  async grantUserAccess(
    @Body() dto: UserAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.validateUserAccessPermission(dto, actor);

    const result = await this.accessControlService.grantUserAccessValidate(
      dto,
      actor,
    );

    return result;
  }

  @Delete()
  @DeleteApiResponses('Revoke user access to another user')
  @ApiBody({ type: UserAccessDto })
  @Transactional()
  async revokeUserAccess(
    @Body() dto: UserAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.validateUserAccessPermission(dto, actor);

    const result = await this.accessControlService.revokeUserAccessValidate(
      dto,
      actor,
    );

    return result;
  }

  private async validateUserAccessPermission(
    dto: UserAccessDto,
    actor: ActorUser,
  ) {
    const doesProfilesMatch =
      await this.accessControlHelperService.doesProfilesMatch(
        dto.granterUserProfileId,
        dto.targetUserProfileId,
      );
    if (!doesProfilesMatch.match) {
      throw new BusinessLogicException(
        'Granter user and target user must have the same profile type',
      );
    }

    if (doesProfilesMatch.profileType === ProfileType.STAFF) {
      const hasStaffCenterAccessPermission =
        await this.accessControlHelperService.hasPermission(
          actor.userProfileId,
          PERMISSIONS.STAFF.GRANT_CENTER_ACCESS.action,
          PERMISSIONS.STAFF.GRANT_CENTER_ACCESS.scope,
          dto.centerId ?? actor.centerId,
        );
      if (!hasStaffCenterAccessPermission) {
        throw new InsufficientPermissionsException(
          'You do not have permission to grant staff center access',
        );
      }
    } else if (doesProfilesMatch.profileType === ProfileType.ADMIN) {
      const hasAdminCenterAccessPermission =
        await this.accessControlHelperService.hasPermission(
          actor.userProfileId,
          PERMISSIONS.ADMIN.GRANT_CENTER_ACCESS.action,
          PERMISSIONS.ADMIN.GRANT_CENTER_ACCESS.scope,
          dto.centerId ?? actor.centerId,
        );
      if (!hasAdminCenterAccessPermission) {
        throw new InsufficientPermissionsException(
          'You do not have permission to grant admin center access',
        );
      }
    } else {
      throw new BusinessLogicException('Invalid user profile type');
    }
  }
}
