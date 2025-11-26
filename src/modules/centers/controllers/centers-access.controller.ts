import {
  Controller,
  Post,
  Body,
  Delete,
  Patch,
  Param,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
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
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import {
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
} from '@/modules/user/dto/toggle-user-status.dto';

@ApiBearerAuth()
@ApiTags('Centers Access')
@Controller('centers/access')
export class CentersAccessController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Patch(':userProfileId/status')
  @UpdateApiResponses('Toggle center access active status')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @ApiBody({ type: ToggleUserStatusRequestDto })
  @Transactional()
  async toggleCenterAccessStatus(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @Body() dto: ToggleUserStatusRequestDto,
    @GetUser() actor: ActorUser,
  ): Promise<ToggleUserStatusResponseDto> {
    if (!actor.centerId) {
      throw new ForbiddenException(
        'You are not authorized to toggle this center access',
      );
    }
    await this.accessControlService.activateCenterAccess(
      {
        centerId: actor.centerId,
        userProfileId: userProfileId,
      },
      dto.isActive,
      actor,
    );

    return {
      id: userProfileId,
      message: this.i18n.translate(
        dto.isActive ? 't.success.userActivated' : 't.success.userDeactivated',
      ),
      isActive: dto.isActive,
    };
  }

  @Post()
  @CreateApiResponses('Grant staff center access to a user for this center')
  @ApiBody({ type: CenterAccessDto })
  @Transactional()
  async grantStaffCenterAccess(
    @Body() dto: CenterAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.accessControlService.grantCenterAccess(
      dto,
      actor,
    );

    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.centerAccessGranted'),
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
    const result = await this.accessControlService.revokeCenterAccess(
      dto,
      actor,
    );

    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.centerAccessRevoked'),
    );
  }

  @Delete(':userProfileId')
  @DeleteApiResponses('Soft delete center access')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @Transactional()
  async deleteCenterAccess(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @GetUser() actor: ActorUser,
  ) {
    if (!actor.centerId) {
      throw new ForbiddenException(
        'You are not authorized to delete this center access',
      );
    }
    await this.accessControlHelperService.validateCenterAccess(
      {
        userProfileId,
        centerId: actor.centerId,
      },
      { includeInactive: true },
    );

    const result = await this.accessControlService.softRemoveCenterAccess(
      { userProfileId, centerId: actor.centerId },
      actor,
    );

    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.centerAccessDeleted'),
    );
  }

  @Patch(':userProfileId/restore')
  @UpdateApiResponses('Restore center access')
  @Transactional()
  async restoreCenterAccess(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @GetUser() actor: ActorUser,
  ) {
    if (!actor.centerId) {
      throw new ForbiddenException(
        'You are not authorized to restore this center access',
      );
    }
    await this.accessControlHelperService.validateCenterAccess(
      {
        userProfileId: userProfileId,
        centerId: actor.centerId,
      },
      { includeInactive: true, includeDeleted: true },
    );
    const result = await this.accessControlService.restoreCenterAccess(
      { userProfileId: userProfileId, centerId: actor.centerId },
      actor,
    );

    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.centerAccessRestored'),
    );
  }
}
