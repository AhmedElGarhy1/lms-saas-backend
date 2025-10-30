import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import {
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { Transactional } from '@nestjs-cls/transactional';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { UpdateUserProfileStatusDto } from '@/modules/user/dto/update-user-profile-status.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';

@ApiTags('User Profiles')
@Controller('user-profiles')
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly activityLogService: ActivityLogService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Get()
  @ReadApiResponses('List user profiles with pagination and filtering')
  @Permissions(PERMISSIONS.ADMIN.READ)
  @NoProfile()
  @NoContext()
  async listProfiles(@GetUser() actor: ActorUser) {
    // Currently returns the actor user's profiles; can be expanded later
    const profiles = await this.userProfileService.listProfiles(actor);

    return ControllerResponse.success(
      profiles,
      this.i18n.translate('success.found', {
        args: { resource: this.i18n.translate('common.resources.profiles') },
      }),
    );
  }

  @Get(':id')
  @ReadApiResponses('Get user profile by ID')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.ADMIN.READ)
  async getProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actor: ActorUser,
  ) {
    const profile = await this.userProfileService.findOne(userProfileId);
    return ControllerResponse.success(
      profile,
      this.i18n.translate('success.found', {
        args: { resource: this.i18n.translate('common.resources.profile') },
      }),
    );
  }

  @Patch(':id/status')
  @UpdateApiResponses('Update user profile status (activate/deactivate)')
  @ApiBody({ type: UpdateUserProfileStatusDto })
  @Permissions(PERMISSIONS.ADMIN.UPDATE)
  @Transactional()
  async updateStatus(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @Body() dto: UpdateUserProfileStatusDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.userProfileService.activateProfileUser(
      userProfileId,
      dto.isActive,
    );

    await this.activityLogService.log(
      dto.isActive
        ? UserActivityType.USER_ACTIVATED
        : UserActivityType.USER_UPDATED,
      {
        targetProfileId: userProfileId,
        isActive: dto.isActive,
        updatedBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.success(
      { id: userProfileId, isActive: dto.isActive },
      this.i18n.translate('success.update', {
        args: { resource: this.i18n.translate('common.resources.profile') },
      }),
    );
  }

  @Delete(':id')
  @DeleteApiResponses('Soft delete user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.ADMIN.DELETE)
  @Transactional()
  async deleteProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.userProfileService.deleteUserProfile(userProfileId);
    await this.activityLogService.log(
      UserActivityType.USER_DELETED,
      {
        targetProfileId: userProfileId,
        deletedBy: actor.id,
      },
      actor,
    );
    return ControllerResponse.success(
      { id: userProfileId },
      this.i18n.translate('success.delete', {
        args: { resource: this.i18n.translate('common.resources.profile') },
      }),
    );
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore soft-deleted user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.ADMIN.UPDATE)
  @Transactional()
  async restoreProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.userProfileService.restoreUserProfile(userProfileId);

    await this.activityLogService.log(
      UserActivityType.USER_RESTORED,
      {
        targetProfileId: userProfileId,
        restoredBy: actor.id,
      },
      actor,
    );

    return ControllerResponse.success(
      { id: userProfileId },
      this.i18n.translate('success.restore', {
        args: { resource: this.i18n.translate('common.resources.profile') },
      }),
    );
  }
}
