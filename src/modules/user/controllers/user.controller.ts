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
import { PaginateUsersDto } from '../dto/paginate-users.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserService } from '../services/user.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { CreateUserWithRoleDto } from '../dto/create-user.dto';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { CreateStudentDto } from '../dto/create-student.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import {
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
} from '../dto/toggle-user-status.dto';
import { RestoreUserResponseDto } from '../dto/delete-user.dto';
import { PaginateAdminsDto } from '../dto/paginate-admins.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { PermissionScope } from '@/modules/access-control/constants/permissions';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly activityLogService: ActivityLogService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Get()
  @ReadApiResponses('List users with pagination and filtering')
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.USER.READ)
  async listUsers(
    @Query() query: PaginateUsersDto,
    @GetUser() actorUser: ActorUser,
  ) {
    return this.userService.paginateUsers(query, actorUser);
  }

  @Get('staff')
  @ReadApiResponses('List staff users with pagination and filtering')
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.USER.READ, PermissionScope.ADMIN)
  async paginateStaff(
    @Query() query: PaginateUsersDto,
    @GetUser() actorUser: ActorUser,
  ) {
    return this.userService.paginateStaff(query, actorUser);
  }

  @Get('admin')
  @ReadApiResponses('List admin users with pagination and filtering')
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.USER.READ, PermissionScope.ADMIN)
  async paginateAdmins(
    @Query() query: PaginateAdminsDto,
    @GetUser() actorUser: ActorUser,
  ) {
    return this.userService.paginateAdmins(query, actorUser);
  }

  @Get(':id')
  @ReadApiResponses('Get user profile by User ID')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @Permissions(PERMISSIONS.USER.READ)
  async findOne(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actor: ActorUser,
  ) {
    return this.userService.findOne(userId);
  }

  @Post()
  @CreateApiResponses('Create a new user')
  @ApiBody({ type: CreateUserWithRoleDto })
  @Permissions(PERMISSIONS.USER.CREATE)
  async createUser(
    @Body() dto: CreateUserWithRoleDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.userService.createUserWithRole(dto, actorUser);

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_CREATED,
      {
        targetUserId: user.id,
        email: user.email,
        name: user.name,
        roleId: dto.roleId,
        centerId: dto.centerId,
        createdBy: actorUser.id,
      },
      actorUser,
    );

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.create', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Post('staff')
  @CreateApiResponses('Create a new staff member')
  @ApiBody({ type: CreateStaffDto })
  @Permissions(PERMISSIONS.USER.CREATE)
  async createStaff(
    @Body() dto: CreateStaffDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.userService.createStaff(dto, actorUser);

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_CREATED,
      {
        targetUserId: user.id,
        email: user.email,
        name: user.name,
        roleId: dto.roleId,
        centerId: dto.centerId,
        createdBy: actorUser.id,
        profileType: 'Staff',
      },
      actorUser,
    );

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.create', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Post('teacher')
  @CreateApiResponses('Create a new teacher')
  @ApiBody({ type: CreateTeacherDto })
  @Permissions(PERMISSIONS.USER.CREATE)
  async createTeacher(
    @Body() dto: CreateTeacherDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.userService.createTeacher(dto, actorUser);

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_CREATED,
      {
        targetUserId: user.id,
        email: user.email,
        name: user.name,
        roleId: dto.roleId,
        centerId: dto.centerId,
        createdBy: actorUser.id,
        profileType: 'Teacher',
      },
      actorUser,
    );

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.create', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Post('admin')
  @CreateApiResponses('Create a new admin')
  @ApiBody({ type: CreateAdminDto })
  @Permissions(PERMISSIONS.USER.CREATE)
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.userService.createAdmin(dto, actorUser);

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_CREATED,
      {
        targetUserId: user.id,
        email: user.email,
        name: user.name,
        roleId: dto.roleId,
        centerId: dto.centerId,
        createdBy: actorUser.id,
        profileType: 'Admin',
      },
      actorUser,
    );

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.create', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Post('student')
  @CreateApiResponses('Create a new student')
  @ApiBody({ type: CreateStudentDto })
  @Permissions(PERMISSIONS.USER.CREATE)
  async createStudent(
    @Body() dto: CreateStudentDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.userService.createStudent(dto, actorUser);

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_CREATED,
      {
        targetUserId: user.id,
        email: user.email,
        name: user.name,
        roleId: dto.roleId,
        centerId: dto.centerId,
        createdBy: actorUser.id,
        profileType: 'Student',
      },
      actorUser,
    );

    return ControllerResponse.success(
      user,
      this.i18n.translate('success.create', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Put(':id')
  @UpdateApiResponses('Update user information')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateUserDto })
  @Permissions(PERMISSIONS.USER.UPDATE)
  async updateUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const user = await this.userService.updateUser(userId, dto, actorUser);

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_UPDATED,
      {
        targetUserId: userId,
        email: user.email,
        name: user.name,
        updatedFields: Object.keys(dto),
        updatedBy: actorUser.id,
      },
      actorUser,
    );

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
  @Permissions(PERMISSIONS.USER.UPDATE)
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

    // Log the activity
    await this.activityLogService.log(
      ActivityType.PASSWORD_CHANGED,
      {
        targetUserId: userId,
        changedBy: actorUser.id,
        isSelfChange: actorUser.id === userId,
      },
      actorUser,
    );

    return ControllerResponse.message(
      this.i18n.translate('success.passwordChange'),
    );
  }

  @Patch(':id/status')
  @UpdateApiResponses('Toggle user active status')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: ToggleUserStatusRequestDto })
  @Permissions(PERMISSIONS.USER.UPDATE)
  async toggleUserStatus(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: ToggleUserStatusRequestDto,
    @GetUser() actorUser: ActorUser,
  ): Promise<ToggleUserStatusResponseDto> {
    await this.userService.activateUser(userId, dto.isActive, actorUser);

    // Log the activity
    const activityType = dto.isActive
      ? ActivityType.USER_ACTIVATED
      : ActivityType.USER_DEACTIVATED;
    await this.activityLogService.log(
      activityType,
      {
        targetUserId: userId,
        isActive: dto.isActive,
        changedBy: actorUser.id,
      },
      actorUser,
    );

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
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @Permissions(PERMISSIONS.USER.DELETE)
  async deleteUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userService.deleteUser(userId, actorUser);

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_DELETED,
      {
        targetUserId: userId,
        deletedBy: actorUser.id,
      },
      actorUser,
    );

    return ControllerResponse.message(
      this.i18n.translate('success.delete', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore a deleted user')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @Permissions(PERMISSIONS.USER.RESTORE)
  async restoreUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @GetUser() actorUser: ActorUser,
  ): Promise<RestoreUserResponseDto> {
    await this.userService.restoreUser(userId, actorUser);

    // Log the activity
    await this.activityLogService.log(
      ActivityType.USER_RESTORED,
      {
        targetUserId: userId,
        restoredBy: actorUser.id,
      },
      actorUser,
    );

    return ControllerResponse.message(
      this.i18n.translate('success.restore', {
        args: { resource: this.i18n.translate('common.resources.user') },
      }),
    );
  }
}
