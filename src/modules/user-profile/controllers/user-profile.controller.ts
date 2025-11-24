import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Patch,
  Body,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiParam, ApiBody } from '@nestjs/swagger';
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { UserProfileService } from '../services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { UpdateUserProfileStatusDto } from '../dto/update-user-profile-status.dto';
import { CreateUserProfileDto } from '../dto/create-user-profile.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';
import { ProfileResponseDto } from '../dto/profile-response.dto';

@ApiTags('User Profiles')
@Controller('user-profiles')
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Post()
  @CreateApiResponses('Create a new user profile')
  @ApiBody({ type: CreateUserProfileDto })
  @Transactional()
  async createProfile(
    @Body() dto: CreateUserProfileDto,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.createProfile(dto, actorUser);

    return ControllerResponse.success(
      null,
      this.i18n.translate('t.success.create', {
        args: { resource: this.i18n.translate('t.common.resources.profile') },
      }),
    );
  }

  @Get('me')
  @ReadApiResponses('Get current user profile')
  @SerializeOptions({ type: ProfileResponseDto })
  @NoContext()
  @NoProfile()
  async getCurrentProfile(@GetUser() actor: ActorUser) {
    const profile = await this.userProfileService.getCurrentUserProfile(actor);

    return ControllerResponse.success(
      profile,
      this.i18n.translate('t.success.found', {
        args: { resource: this.i18n.translate('t.common.resources.profile') },
      }),
    );
  }

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
      this.i18n.translate('t.success.found', {
        args: { resource: this.i18n.translate('t.common.resources.profiles') },
      }),
    );
  }

  @Get(':id')
  @ReadApiResponses('Get user profile by ID')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.ADMIN.READ)
  async getProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() _actorUser: ActorUser, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    const profile = await this.userProfileService.findOne(userProfileId);
    return ControllerResponse.success(
      profile,
      this.i18n.translate('t.success.found', {
        args: { resource: this.i18n.translate('t.common.resources.profile') },
      }),
    );
  }

  @Put(':id')
  @UpdateApiResponses('Update user profile information')
  @ApiParam({
    name: 'id',
    description: 'User Profile ID',
    type: String,
  })
  @ApiBody({ type: UpdateUserProfileDto })
  @SerializeOptions({ type: UserResponseDto })
  @Transactional()
  async updateProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @Body() dto: UpdateUserProfileDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.userProfileService.updateProfile(
      userProfileId,
      dto,
      actorUser,
    );

    return ControllerResponse.success(
      user,
      this.i18n.translate('t.success.update', {
        args: { resource: this.i18n.translate('t.common.resources.profile') },
      }),
    );
  }

  @Patch(':id/status')
  @UpdateApiResponses('Update user profile status (activate/deactivate)')
  @ApiBody({ type: UpdateUserProfileStatusDto })
  @Transactional()
  async updateStatus(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @Body() dto: UpdateUserProfileStatusDto,
    @GetUser() actor: ActorUser,
  ) {
    // Use UserService method which handles event emission
    await this.userService.activateProfileUser(
      userProfileId,
      dto.isActive,
      actor,
    );

    return ControllerResponse.success(
      { id: userProfileId, isActive: dto.isActive },
      this.i18n.translate('t.success.update', {
        args: { resource: this.i18n.translate('t.common.resources.profile') },
      }),
    );
  }

  @Delete(':id')
  @DeleteApiResponses('Soft delete user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Transactional()
  async deleteProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.deleteUserProfile(userProfileId, actorUser);
    // Note: Activity logging should be handled by event listeners if UserProfileService emits events
    return ControllerResponse.success(
      { id: userProfileId },
      this.i18n.translate('t.success.delete', {
        args: { resource: this.i18n.translate('t.common.resources.profile') },
      }),
    );
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore soft-deleted user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Transactional()
  async restoreProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.restoreUserProfile(userProfileId, actorUser);
    // Note: Activity logging should be handled by event listeners if UserProfileService emits events
    return ControllerResponse.success(
      { id: userProfileId },
      this.i18n.translate('t.success.restore', {
        args: { resource: this.i18n.translate('t.common.resources.profile') },
      }),
    );
  }
}
