import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { PaginateStaffDto } from '../dto/paginate-staff.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { StaffService } from '../services/staff.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import {
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
} from '@/modules/user/dto/toggle-user-status.dto';
import { RestoreUserResponseDto } from '@/modules/user/dto/delete-user.dto';
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
    return this.staffService.paginateStaff(query, actorUser);
  }

  @Get(':id')
  @ReadApiResponses('Get staff member by User ID')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @Permissions(PERMISSIONS.STAFF.READ)
  async findOne(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actor: ActorUser,
  ) {
    return this.staffService.findOne(userId);
  }

  @Post()
  @CreateApiResponses('Create a new staff member')
  @ApiBody({ type: CreateStaffDto })
  @Permissions(PERMISSIONS.STAFF.CREATE)
  @Transactional()
  async createStaff(
    @Body() dto: CreateStaffDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.staffService.createStaff(dto, actorUser);

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.create', {
        args: { resource: this.i18n.translate('common.resources.staff') },
      }),
    );
  }

  @Put(':id')
  @UpdateApiResponses('Update staff member information')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateStaffDto })
  @Permissions(PERMISSIONS.STAFF.UPDATE)
  @Transactional()
  async updateStaff(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateStaffDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.staffService.updateStaff(userId, dto, actorUser);

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.update', {
        args: { resource: this.i18n.translate('common.resources.staff') },
      }),
    );
  }

  @Patch(':id/status')
  @UpdateApiResponses('Toggle staff member active status')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: ToggleUserStatusRequestDto })
  @Permissions(PERMISSIONS.STAFF.UPDATE)
  async toggleStaffStatus(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: ToggleUserStatusRequestDto,
    @GetUser() actorUser: ActorUser,
  ): Promise<ToggleUserStatusResponseDto> {
    await this.staffService.toggleStaffStatus(userId, dto.isActive, actorUser);

    return {
      id: userId,
      message: this.i18n.translate(
        dto.isActive ? 'success.userActivated' : 'success.userDeactivated',
      ),
      isActive: dto.isActive,
    };
  }

  @Delete(':id')
  @DeleteApiResponses('Delete a staff member')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @Permissions(PERMISSIONS.STAFF.DELETE)
  async deleteStaff(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.staffService.deleteStaff(userId, actorUser);

    return ControllerResponse.message(
      this.i18n.translate('success.delete', {
        args: { resource: this.i18n.translate('common.resources.staff') },
      }),
    );
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore a deleted staff member')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @Permissions(PERMISSIONS.STAFF.RESTORE)
  async restoreStaff(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actorUser: ActorUser,
  ): Promise<RestoreUserResponseDto> {
    await this.staffService.restoreStaff(userId, actorUser);

    return ControllerResponse.message(
      this.i18n.translate('success.restore', {
        args: { resource: this.i18n.translate('common.resources.staff') },
      }),
    );
  }
}
