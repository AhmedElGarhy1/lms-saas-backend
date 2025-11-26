import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReadApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { PaginateAdminDto } from '../dto/paginate-admin.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AdminService } from '../services/admin.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Get()
  @ReadApiResponses('List admin users with pagination and filtering')
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.ADMIN.READ)
  async paginateAdmins(
    @Query() query: PaginateAdminDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const result = await this.adminService.paginateAdmins(query, actorUser);
    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.dataRetrieved'),
    );
  }
}
