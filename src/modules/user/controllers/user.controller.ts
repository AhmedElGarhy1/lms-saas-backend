import { Controller, Put, Body } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { UserService } from '../services/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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

    return ControllerResponse.success(user, 't.success.update', {
      resource: 't.common.resources.user',
    });
  }
}
