import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import { AdminOnly, ReadApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { PaginateAdminDto } from '../dto/paginate-admin.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AdminService } from '../services/admin.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { UserProfileIdParamDto } from '@/modules/user-profile/dto/user-profile-id-param.dto';

@ApiTags('Admin')
@Controller('admin')
@AdminOnly()
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
    const result = await this.adminService.paginateAdmins(query, actorUser);
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.admin' },
    });
  }

  @Get(':id')
  @ReadApiResponses('Get admin user by ID')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.ADMIN.READ)
  async getAdmin(
    @Param() params: UserProfileIdParamDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const result = await this.adminService.findOne(
      params.id,
      actorUser,
      true, // includeDeleted: true for API endpoints
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.admin' },
    });
  }
}
