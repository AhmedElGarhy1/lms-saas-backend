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
import { PaginateAdminDto } from '../dto/paginate-admin.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AdminService } from '../services/admin.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import {
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
} from '@/modules/user/dto/toggle-user-status.dto';
import { RestoreUserResponseDto } from '@/modules/user/dto/delete-user.dto';
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

  @Post()
  @CreateApiResponses('Create a new admin user')
  @ApiBody({ type: CreateAdminDto })
  @Permissions(PERMISSIONS.ADMIN.CREATE)
  @Transactional()
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.adminService.createAdmin(dto, actorUser);

    return ControllerResponse.success(
      null,
      this.i18n.translate('success.create', {
        args: { resource: this.i18n.translate('common.resources.admin') },
      }),
    );
  }

  @Put(':userProfileId')
  @UpdateApiResponses('Update admin user information')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @ApiBody({ type: UpdateAdminDto })
  @Permissions(PERMISSIONS.ADMIN.UPDATE)
  @Transactional()
  async updateAdmin(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @Body() dto: UpdateAdminDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.adminService.updateAdmin(
      userProfileId,
      dto,
      actorUser,
    );

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.update', {
        args: { resource: this.i18n.translate('common.resources.admin') },
      }),
    );
  }

  @Patch(':userProfileId/status')
  @UpdateApiResponses('Toggle admin user active status')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @ApiBody({ type: ToggleUserStatusRequestDto })
  @Permissions(PERMISSIONS.ADMIN.UPDATE)
  async toggleAdminStatus(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @Body() dto: ToggleUserStatusRequestDto,
    @GetUser() actorUser: ActorUser,
  ): Promise<ToggleUserStatusResponseDto> {
    await this.adminService.toggleAdminStatus(
      userProfileId,
      dto.isActive,
      actorUser,
    );

    return {
      id: userProfileId,
      message: this.i18n.translate(
        dto.isActive ? 'success.userActivated' : 'success.userDeactivated',
      ),
      isActive: dto.isActive,
    };
  }

  @Delete(':userProfileId')
  @DeleteApiResponses('Delete an admin user')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @Permissions(PERMISSIONS.ADMIN.DELETE)
  async deleteAdmin(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.adminService.deleteAdmin(userProfileId, actorUser);

    return ControllerResponse.message(
      this.i18n.translate('success.delete', {
        args: { resource: this.i18n.translate('common.resources.admin') },
      }),
    );
  }

  @Patch(':userProfileId/restore')
  @UpdateApiResponses('Restore a deleted admin user')
  @ApiParam({
    name: 'userProfileId',
    description: 'User Profile ID',
    type: String,
  })
  @Permissions(PERMISSIONS.ADMIN.RESTORE)
  async restoreAdmin(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @GetUser() actorUser: ActorUser,
  ): Promise<RestoreUserResponseDto> {
    await this.adminService.restoreAdmin(userProfileId, actorUser);

    return ControllerResponse.message(
      this.i18n.translate('success.restore', {
        args: { resource: this.i18n.translate('common.resources.admin') },
      }),
    );
  }
}
