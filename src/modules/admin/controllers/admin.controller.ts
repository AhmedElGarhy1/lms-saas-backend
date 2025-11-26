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
    const result = await this.adminService.paginateAdmins(query, actorUser);
    return ControllerResponse.success(result, 't.success.dataRetrieved');
  }
}
