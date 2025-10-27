import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import {
  ReadApiResponses,
  UpdateApiResponses,
} from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { PaginateProfilesDto } from '../dto/paginate-profiles.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Get('me')
  @ReadApiResponses('Get current user profile')
  @SerializeOptions({ type: ProfileResponseDto })
  @NoContext()
  async getCurrentProfile(@GetUser() actor: ActorUser) {
    const profile = await this.userProfileService.getCurrentUserProfile(actor);

    return ControllerResponse.success(
      profile,
      this.i18n.translate('success.found', {
        args: { resource: this.i18n.translate('common.resources.profile') },
      }),
    );
  }

  @Put('me')
  @UpdateApiResponses('Update current user profile')
  @ApiBody({ type: UpdateProfileDto })
  @NoContext()
  async updateCurrentProfile(
    @Body() dto: UpdateProfileDto,
    @GetUser() actor: ActorUser,
  ) {
    const user = await this.userProfileService.updateUserProfile(actor, dto);

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.update', {
        args: { resource: this.i18n.translate('common.resources.profile') },
      }),
    );
  }

  @Get(':id')
  @ReadApiResponses('Get user profile by ID')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @SerializeOptions({ type: ProfileResponseDto })
  @Permissions(PERMISSIONS.ADMIN.READ)
  async getProfileById(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actor: ActorUser,
  ) {
    // For now, we'll use the current profile service
    // In the future, this could be enhanced to get any user's profile
    const profile = await this.userProfileService.getCurrentUserProfile(actor);

    return ControllerResponse.success(
      profile,
      this.i18n.translate('success.found', {
        args: { resource: this.i18n.translate('common.resources.profile') },
      }),
    );
  }

  @Get()
  @ReadApiResponses('List all profiles with pagination and filtering')
  @SerializeOptions({ type: ProfileResponseDto })
  @Permissions(PERMISSIONS.ADMIN.READ)
  @NoProfile()
  @NoContext()
  async listProfiles(
    @Query() query: PaginateProfilesDto,
    @GetUser() actor: ActorUser,
  ) {
    // For now, we'll return the current user's profiles
    // In the future, this could be enhanced to list all profiles with proper pagination
    const profiles = await this.userProfileService.listProfiles(actor);

    return ControllerResponse.success(
      profiles,
      this.i18n.translate('success.found', {
        args: { resource: this.i18n.translate('common.resources.profiles') },
      }),
    );
  }
}
