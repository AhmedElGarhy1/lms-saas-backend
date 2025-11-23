import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  ReadApiResponses,
} from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { PaginateStaffDto } from '../dto/paginate-staff.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { StaffService } from '../services/staff.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

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
    return ControllerResponse.success(
      result,
      this.i18n.translate('api.success.dataRetrieved'),
    );
  }

  @Get(':userProfileId')
  @ReadApiResponses('Get staff member by User Profile ID')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @Permissions(PERMISSIONS.STAFF.READ)
  async findOne(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.staffService.findOne(userProfileId);
    return ControllerResponse.success(
      result,
      this.i18n.translate('api.success.dataRetrieved'),
    );
  }

}
