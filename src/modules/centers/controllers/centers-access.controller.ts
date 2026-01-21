import { Controller, Post, Body, Delete, Patch, Param } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
  UpdateApiResponses,
} from '@/shared/common/decorators/api-responses.decorator';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { CenterAccessDto } from '@/modules/access-control/dto/center-access.dto';
import {
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
} from '@/modules/user/dto/toggle-user-status.dto';
// TranslationService removed - no longer needed after translation removal
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserProfileIdParamDto } from '@/modules/access-control/dto/user-profile-id-param.dto';
import { DeletedUserProfileIdParamDto } from '@/modules/access-control/dto/deleted-user-profile-id-param.dto';
import { AdminOnly, ManagerialOnly } from '@/shared/common/decorators';

@ApiBearerAuth()
@ApiTags('Centers Access')
@Controller('centers/access')
export class CentersAccessController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Patch(':userProfileId/status')
  @UpdateApiResponses('Toggle center access active status')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @ApiBody({ type: ToggleUserStatusRequestDto })
  @Permissions(PERMISSIONS.STAFF.ACTIVATE_CENTER_ACCESS)
  @Transactional()
  @ManagerialOnly()
  async toggleCenterAccessStatus(
    @Param() params: UserProfileIdParamDto,
    @Body() dto: ToggleUserStatusRequestDto,
    @GetUser() actor: ActorUser,
  ): Promise<ToggleUserStatusResponseDto> {
    await this.accessControlService.activateCenterAccess(
      {
        centerId: actor.centerId!,
        userProfileId: params.userProfileId,
      },
      dto.isActive,
      actor,
    );

    return {
      id: params.userProfileId,
      message: dto.isActive
        ? 'Center access activated'
        : 'Center access deactivated',
      isActive: dto.isActive,
    };
  }

  @Post()
  @CreateApiResponses('Grant center access to a user')
  @ApiBody({ type: CenterAccessDto })
  @Transactional()
  @AdminOnly()
  async grantCenterAccess(
    @Body() dto: CenterAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.grantCenterAccess(
      dto,
      actor,
    );

    return ControllerResponse.success(result);
  }

  @Delete()
  @DeleteApiResponses('Revoke staff center access from a user for this center')
  @ApiParam({ name: 'id', description: 'Center ID', type: String })
  @ApiBody({ type: CenterAccessDto })
  @Transactional()
  @AdminOnly()
  async revokeStaffCenterAccess(
    @Body() dto: CenterAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.revokeCenterAccess(
      dto,
      actor,
    );

    return ControllerResponse.success(result);
  }

  @Delete(':userProfileId')
  @DeleteApiResponses('Soft delete center access')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @Permissions(PERMISSIONS.STAFF.DELETE_CENTER_ACCESS)
  @Transactional()
  @ManagerialOnly()
  async deleteCenterAccess(
    @Param() params: UserProfileIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.softRemoveCenterAccess(
      { userProfileId: params.userProfileId, centerId: actor.centerId! },
      actor,
    );

    return ControllerResponse.success(result);
  }

  @Patch(':userProfileId/restore')
  @UpdateApiResponses('Restore center access')
  @Permissions(PERMISSIONS.STAFF.RESTORE_CENTER_ACCESS)
  @Transactional()
  @ManagerialOnly()
  async restoreCenterAccess(
    @Param() params: DeletedUserProfileIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.restoreCenterAccess(
      { userProfileId: params.userProfileId, centerId: actor.centerId! },
      actor,
    );

    return ControllerResponse.success(result);
  }
}
