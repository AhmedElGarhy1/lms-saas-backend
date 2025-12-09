import {
  Controller,
  Get,
  Post,
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
  NoPhoneVerification,
} from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { UserProfileService } from '../services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { UpdateUserProfileStatusDto } from '../dto/update-user-profile-status.dto';
import { CreateUserProfileDto } from '../dto/create-user-profile.dto';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiTags('User Profiles')
@Controller('user-profiles')
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
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

    return ControllerResponse.success(null, {
      key: 't.messages.created',
      args: { resource: 't.resources.profile' },
    });
  }

  @Get('me')
  @ReadApiResponses('Get current user profile')
  @SerializeOptions({ type: ProfileResponseDto })
  @NoContext()
  @NoProfile()
  @NoPhoneVerification()
  async getCurrentProfile(@GetUser() actor: ActorUser) {
    const profile = await this.userProfileService.getCurrentUserProfile(actor);

    return ControllerResponse.success(profile, {
      key: 't.messages.found',
      args: { resource: 't.resources.profile' },
    });
  }

  @Get()
  @ReadApiResponses('List user profiles with pagination and filtering')
  @NoProfile()
  @NoContext()
  async listProfiles(@GetUser() actor: ActorUser) {
    // Currently returns the actor user's profiles; can be expanded later
    const profiles = await this.userProfileService.listProfiles(actor);

    return ControllerResponse.success(profiles, {
      key: 't.messages.found',
      args: { resource: 't.resources.profiles' },
    });
  }

  @Get(':id')
  @ReadApiResponses('Get user profile by ID')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  async getProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    const profile = await this.userProfileService.findOne(
      userProfileId,
      actorUser,
    );
    return ControllerResponse.success(profile, {
      key: 't.messages.found',
      args: { resource: 't.resources.profile' },
    });
  }

  @Patch(':id/status')
  @UpdateApiResponses('Update user profile status (activate/deactivate)')
  @ApiBody({ type: UpdateUserProfileStatusDto })
  @Permissions(PERMISSIONS.STAFF.ACTIVATE)
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
      {
        key: 't.messages.updated',
        args: { resource: 't.resources.profile' },
      },
    );
  }

  @Delete(':id')
  @DeleteApiResponses('Soft delete user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.STAFF.DELETE)
  @Transactional()
  async deleteProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.deleteUserProfile(userProfileId, actorUser);
    // Note: Activity logging should be handled by event listeners if UserProfileService emits events
    return ControllerResponse.success(
      { id: userProfileId },
      {
        key: 't.messages.deleted',
        args: { resource: 't.resources.profile' },
      },
    );
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore soft-deleted user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.STAFF.RESTORE)
  @Transactional()
  async restoreProfile(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.restoreUserProfile(userProfileId, actorUser);
    // Note: Activity logging should be handled by event listeners if UserProfileService emits events
    return ControllerResponse.success(
      { id: userProfileId },
      {
        key: 't.messages.restored',
        args: { resource: 't.resources.profile' },
      },
    );
  }
}
