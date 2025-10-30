import {
  Controller,
  Get,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { Transactional } from '@nestjs-cls/transactional';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserService } from '../services/user.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import {
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
} from '../dto/toggle-user-status.dto';
import { RestoreUserResponseDto } from '../dto/delete-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@ApiTags('Users (Legacy)')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  // @Get()
  // @ReadApiResponses('List users with pagination and filtering')
  // @SerializeOptions({ type: UserResponseDto })
  // @Permissions(PERMISSIONS.USER.READ)
  // async listUsers(
  //   @Query() query: PaginateUsersDto,
  //   @GetUser() actorUser: ActorUser,
  // ) {
  //   return this.userService.paginateUsers(query, actorUser);
  // }

  @Get(':id')
  @ReadApiResponses('Get user profile by User ID')
  @ApiOperation({
    summary: 'Get user profile by User ID',
    deprecated: true,
    description:
      'DEPRECATED: Use /staff/:id or /admin/:id instead. This endpoint will be removed in a future version.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    headers: {
      'X-Deprecated': {
        description:
          'This endpoint is deprecated. Use /staff/:id or /admin/:id instead.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @Permissions(PERMISSIONS.STAFF.READ)
  async findOne(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actor: ActorUser,
  ) {
    return this.userService.findOne(userId);
  }

  // @Post()
  // @CreateApiResponses('Create a new user')
  // @ApiBody({ type: CreateUserWithRoleDto })
  // @Permissions(PERMISSIONS.STAFF.CREATE)
  // @Transactional()
  // async createUser(
  //   @Body() dto: CreateUserWithRoleDto,
  //   @GetUser() actorUser: ActorUser,
  // ) {
  //   const user = await this.userService.createUserWithRole(dto, actorUser);

  //   return ControllerResponse.success(
  //     user,
  //     this.i18n.translate('success.create', {
  //       args: { resource: this.i18n.translate('common.resources.user') },
  //     }),
  //   );
  // }

  @Put(':id')
  @UpdateApiResponses('Update user information')
  @ApiOperation({
    summary: 'Update user information',
    deprecated: true,
    description:
      'DEPRECATED: Use /staff/:id or /admin/:id instead. This endpoint will be removed in a future version.',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    headers: {
      'X-Deprecated': {
        description:
          'This endpoint is deprecated. Use /staff/:id or /admin/:id instead.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateUserDto })
  @Permissions(PERMISSIONS.STAFF.UPDATE)
  @Transactional()
  async updateUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.userService.updateUser(userId, dto, actorUser);

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.update', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Patch(':id/password')
  @UpdateApiResponses('Change user password')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: ChangePasswordRequestDto })
  @Permissions(PERMISSIONS.STAFF.UPDATE)
  async changePassword(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: ChangePasswordRequestDto,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userService.changePassword({
      userId,
      dto,
      centerId: actorUser.centerId,
    });

    return ControllerResponse.message(
      this.i18n.translate('success.passwordChange'),
    );
  }

  @Patch(':id/status')
  @UpdateApiResponses('Toggle user active status')
  @ApiOperation({
    summary: 'Toggle user active status',
    deprecated: true,
    description:
      'DEPRECATED: Use /staff/:id/status or /admin/:id/status instead. This endpoint will be removed in a future version.',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    headers: {
      'X-Deprecated': {
        description:
          'This endpoint is deprecated. Use /staff/:id/status or /admin/:id/status instead.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: ToggleUserStatusRequestDto })
  @Permissions(PERMISSIONS.STAFF.UPDATE)
  async toggleUserStatus(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: ToggleUserStatusRequestDto,
    @GetUser() actorUser: ActorUser,
  ): Promise<ToggleUserStatusResponseDto> {
    await this.userService.activateUser(userId, dto.isActive, actorUser);

    return {
      id: userId,
      message: this.i18n.translate(
        dto.isActive ? 'success.userActivated' : 'success.userDeactivated',
      ),
      isActive: dto.isActive,
    };
  }

  @Delete(':id')
  @DeleteApiResponses('Delete a user')
  @ApiOperation({
    summary: 'Delete a user',
    deprecated: true,
    description:
      'DEPRECATED: Use /staff/:id or /admin/:id instead. This endpoint will be removed in a future version.',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    headers: {
      'X-Deprecated': {
        description:
          'This endpoint is deprecated. Use /staff/:id or /admin/:id instead.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @Permissions(PERMISSIONS.STAFF.DELETE)
  async deleteUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userService.deleteUser(userId, actorUser);

    return ControllerResponse.message(
      this.i18n.translate('success.delete', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore a deleted user')
  @ApiOperation({
    summary: 'Restore a deleted user',
    deprecated: true,
    description:
      'DEPRECATED: Use /staff/:id/restore or /admin/:id/restore instead. This endpoint will be removed in a future version.',
  })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
    headers: {
      'X-Deprecated': {
        description:
          'This endpoint is deprecated. Use /staff/:id/restore or /admin/:id/restore instead.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @Permissions(PERMISSIONS.STAFF.RESTORE)
  async restoreUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actorUser: ActorUser,
  ): Promise<RestoreUserResponseDto> {
    await this.userService.restoreUser(userId, actorUser);

    return ControllerResponse.message(
      this.i18n.translate('success.restore', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }
}
