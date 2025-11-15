import { Controller, Put, Get, Body } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { UpdateApiResponses, ReadApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { UserService } from '../services/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Get('me')
  @ReadApiResponses('Get current user information')
  @SerializeOptions({ type: UserResponseDto })
  @NoContext()
  @NoProfile()
  async getCurrentUser(@GetUser() actor: ActorUser) {
    const user = await this.userService.findOne(actor.id);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.found', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Put('me')
  @UpdateApiResponses('Update current user information')
  @ApiBody({ type: UpdateUserDto })
  @SerializeOptions({ type: UserResponseDto })
  @NoContext()
  @NoProfile()
  @Transactional()
  async updateCurrentUser(
    @Body() dto: UpdateUserDto,
    @GetUser() actor: ActorUser,
  ) {
    const user = await this.userService.updateUser(actor.id, dto, actor);

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.update', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }
}

