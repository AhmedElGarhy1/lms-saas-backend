import { Controller, Get, Body, Query, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ReadApiResponses,
  UpdateApiResponses,
} from '@/shared/common/decorators';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';
import { UserProfileService } from '../services/user-profile.service';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly activityLogService: ActivityLogService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Get()
  @ReadApiResponses('List profiles')
  @NoProfile()
  @NoContext()
  async listProfiles(@GetUser() actorUser: ActorUser) {
    return this.userProfileService.listProfiles(actorUser);
  }

  @Get('me')
  @ReadApiResponses('Get current user profile with comprehensive information')
  @NoContext()
  async getActorUserProfile(@GetUser() actorUser: ActorUser) {
    return this.userProfileService.getCurrentUserProfile(actorUser);
  }

  @Put()
  @UpdateApiResponses('Update current user profile')
  @NoContext()
  async updateActorUserProfile(
    @Body() dto: UpdateUserDto,
    @GetUser() actorUser: ActorUser,
  ) {
    return this.userProfileService.updateUserProfile(actorUser, dto);
  }
}
