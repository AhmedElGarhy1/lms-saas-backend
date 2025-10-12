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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SerializeOptions } from '@nestjs/common';
import { PaginateUsersDto } from '../dto/paginate-users.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import {
  ActorUser,
  ActorUser as actorUserType,
} from '@/shared/common/types/actor-user.type';
import { UserService } from '../services/user.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { CreateUserDto, CreateUserWithRoleDto } from '../dto/create-user.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import {
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
} from '../dto/toggle-user-status.dto';
import {
  DeleteUserResponseDto,
  RestoreUserResponseDto,
} from '../dto/delete-user.dto';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { Scope, ScopeType } from '@/shared/common/decorators';
import { PaginateAdminsDto } from '../dto/paginate-admins.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly accessControlService: AccessControlService,
  ) {}

  // ===== USER-USER ACCESS RELATIONSHIPS =====
  @Post('access')
  @ApiOperation({ summary: 'Grant user access to another user' })
  @ApiBody({ type: UserAccessDto })
  @ApiResponse({ status: 201, description: 'User access granted' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 403,
    description: 'Access denied: Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot grant access to SUPER_ADMIN or CENTER_ADMIN users',
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.GRANT.action)
  grantUserAccess(@Body() dto: UserAccessDto, @GetUser() actor: ActorUser) {
    return this.accessControlService.grantUserAccessValidate(dto, actor);
  }

  @Delete('access')
  @ApiOperation({ summary: 'Revoke user access to another user' })
  @ApiBody({ type: UserAccessDto })
  @ApiResponse({ status: 200, description: 'User access revoked' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 403,
    description: 'Access denied: Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot revoke access from SUPER_ADMIN or CENTER_ADMIN users',
  })
  @Permissions(PERMISSIONS.ACCESS_CONTROL.USER_ACCESS.REVOKE.action)
  revokeUserAccess(@Body() dto: UserAccessDto, @GetUser() actor: ActorUser) {
    return this.accessControlService.revokeUserAccessValidate(dto, actor);
  }

  @Get()
  @ApiOperation({
    summary: 'List users with pagination and filtering',
    description:
      'Get paginated list of users with filtering by status, role, and other criteria',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully (filtered by access control)',
    type: [UserResponseDto],
  })
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.USER.READ.action)
  async listUsers(
    @Query() query: PaginateUsersDto,
    @GetUser() actorUser: ActorUser,
  ) {
    return this.userService.paginateUsers(query, actorUser);
  }

  @Get('admin')
  @ApiOperation({
    summary: 'List users with pagination and filtering',
    description:
      'Get paginated list of users with filtering by status, role, and other criteria',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully (filtered by access control)',
    type: [UserResponseDto],
  })
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.USER.READ.action)
  @Scope(ScopeType.ADMIN)
  async paginateAdmins(
    @Query() query: PaginateAdminsDto,
    @GetUser() actorUser: ActorUser,
  ) {
    return this.userService.paginateAdmins(query, actorUser);
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile with comprehensive information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getActorUserProfile(@GetUser() actorUser: actorUserType) {
    return this.userService.getCurrentUserProfile({
      userId: actorUser.id,
      centerId: actorUser.centerId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.READ.action)
  async findOne(
    @Param('id') userId: string,
    @Query('centerId') centerId?: string,
    @GetUser() actorUser?: actorUserType,
  ) {
    // TODO: implement later
    return this.userService.getProfile({
      userId,
      centerId: actorUser?.centerId || centerId,
      currentUserId: actorUser?.id,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserWithRoleDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @Permissions(PERMISSIONS.USER.CREATE.action)
  async createUser(
    @Body() dto: CreateUserWithRoleDto,
    @GetUser() actorUser: actorUserType,
  ) {
    return this.userService.createUserWithRole(dto, actorUser);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.UPDATE.action)
  async updateUser(
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
    @GetUser() actorUser: actorUserType,
  ) {
    return this.userService.updateUser(userId, dto, actorUser);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: ChangePasswordRequestDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.UPDATE.action)
  async changePassword(
    @Param('id') userId: string,
    @Body() dto: ChangePasswordRequestDto,
    @GetUser() actorUser: actorUserType,
  ) {
    return this.userService.changePassword({
      userId,
      dto,
      centerId: actorUser.centerId,
    });
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.USER.UPDATE.action)
  @ApiOperation({ summary: 'Toggle user active status' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: ToggleUserStatusRequestDto })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    type: ToggleUserStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleUserStatus(
    @Param('id') userId: string,
    @Body() dto: ToggleUserStatusRequestDto,
    @GetUser() actorUser: actorUserType,
  ): Promise<ToggleUserStatusResponseDto> {
    await this.userService.activateUser(userId, dto.isActive, actorUser);
    return {
      id: userId,
      message: `User ${dto.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: dto.isActive,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: DeleteUserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.DELETE.action)
  async deleteUser(
    @Param('id') userId: string,
    @GetUser() actorUser: actorUserType,
  ): Promise<DeleteUserResponseDto> {
    await this.userService.deleteUser(userId, actorUser);
    return { message: 'User deleted successfully' };
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
    type: RestoreUserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.RESTORE.action)
  async restoreUser(
    @Param('id') userId: string,
    @GetUser() actorUser: actorUserType,
  ): Promise<RestoreUserResponseDto> {
    await this.userService.restoreUser(userId, actorUser);
    return { message: 'User restored successfully' };
  }
}
