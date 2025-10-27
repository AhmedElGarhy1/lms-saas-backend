import { Controller, Post, Body, Delete } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators/api-responses.decorator';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import {
  PERMISSIONS,
  PermissionScope,
} from '@/modules/access-control/constants/permissions';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { CenterAccessDto } from '@/modules/access-control/dto/center-access.dto';
import {
  BusinessLogicException,
  InsufficientPermissionsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@ApiBearerAuth()
@ApiTags('Centers Access')
@Controller('centers/access')
export class CentersAccessController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  @Post()
  @CreateApiResponses('Grant staff center access to a user for this center')
  @ApiBody({ type: CenterAccessDto })
  @Transactional()
  async grantStaffCenterAccess(
    @Body() dto: CenterAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.validateCenterAccessPermission(dto, actor);

    const result = await this.accessControlService.grantCenterAccess(
      dto,
      actor,
    );

    return ControllerResponse.success(
      result,
      'Center access granted successfully',
    );
  }

  @Delete()
  @DeleteApiResponses('Revoke staff center access from a user for this center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: CenterAccessDto })
  @Transactional()
  async revokeStaffCenterAccess(
    @Body() dto: CenterAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.validateCenterAccessPermission(dto, actor);

    const result = await this.accessControlService.revokeCenterAccess(
      dto,
      actor,
    );

    return ControllerResponse.success(
      result,
      'Center access revoked successfully',
    );
  }

  private async validateCenterAccessPermission(
    dto: CenterAccessDto,
    actor: ActorUser,
  ) {
    const userProfile = await this.accessControlHelperService.findUserProfile(
      dto.userProfileId,
    );

    if (userProfile?.profileType === ProfileType.STAFF) {
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
    } else if (userProfile?.profileType === ProfileType.ADMIN) {
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
      throw new BusinessLogicException(
        'Target user must have an admin or staff profile to grant center access',
      );
    }
  }
}
