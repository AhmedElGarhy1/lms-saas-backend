import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReadApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { PaginateAdminDto } from '../dto/paginate-admin.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AdminService } from '../services/admin.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ReadApiResponses('List admin users with pagination and filtering')
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.ADMIN.READ)
  async paginateAdmins(
    @Query() query: PaginateAdminDto,
    @GetUser() actorUser: ActorUser,
  ) {
    return this.adminService.paginateAdmins(query, actorUser);
  }

  @Get(':userProfileId')
  @ReadApiResponses('Get admin user by User Profile ID')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @Permissions(PERMISSIONS.ADMIN.READ)
  async findOne(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @GetUser() actor: ActorUser,
  ) {
    return this.adminService.findOne(userProfileId, actor);
  }
}
