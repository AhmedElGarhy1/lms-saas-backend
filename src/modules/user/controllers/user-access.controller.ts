import { Controller, Post, Body, Delete } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';

@ApiTags('User Access')
@Controller('users/access')
export class UserAccessController {
  constructor(
    private readonly accessControlService: AccessControlService,
  ) {}

  @Post()
  @CreateApiResponses('Grant user access to another user')
  @ApiBody({ type: UserAccessDto })
  @Transactional()
  async grantUserAccess(
    @Body() dto: UserAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    // Validation is now handled in AccessControlService.grantUserAccessValidate
    await this.accessControlService.grantUserAccessValidate(dto, actor);

    return { success: true };
  }

  @Delete()
  @DeleteApiResponses('Revoke user access to another user')
  @ApiBody({ type: UserAccessDto })
  @Transactional()
  async revokeUserAccess(
    @Body() dto: UserAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    // Validation is now handled in AccessControlService.revokeUserAccessValidate
    await this.accessControlService.revokeUserAccessValidate(dto, actor);

    return { success: true };
  }
}
