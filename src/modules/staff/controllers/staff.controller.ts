import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReadApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { PaginateStaffDto } from '../dto/paginate-staff.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { StaffService } from '../services/staff.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ReadApiResponses('List staff members with pagination and filtering')
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.STAFF.READ)
  async paginateStaff(
    @Query() query: PaginateStaffDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const result = await this.staffService.paginateStaff(query, actorUser);
    // Wrap in ControllerResponse for consistent messaging
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.staff' },
    });
  }
}
