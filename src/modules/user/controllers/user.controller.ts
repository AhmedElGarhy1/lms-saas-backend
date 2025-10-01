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
import { PaginateWithFilters } from '@/shared/common/decorators/paginate-with-filters.decorator';
import { UserFilterDto } from '../dto/user-filter.dto';
import {
  ApiPagination,
  CommonFilters,
} from '@/shared/common/decorators/api-pagination.decorator';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '@/shared/common/types/current-user.type';
import { UserService } from '../services/user.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { UpdateUserRequestDto } from '../dto/update-user.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import {
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
} from '../dto/toggle-user-status.dto';
import {
  DeleteUserResponseDto,
  RestoreUserResponseDto,
} from '../dto/delete-user.dto';

import { USER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'List users with pagination and filtering',
    description:
      'Get paginated list of users with filtering by status, role, and other criteria',
  })
  @ApiPagination()
  @CommonFilters.user()
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully (filtered by access control)',
  })
  @Permissions(PERMISSIONS.USER.READ.action)
  async listUsers(
    @PaginateWithFilters({
      maxPage: 1000,
      maxLimit: 50,
      minLimit: 1,
      allowedSortFields: USER_PAGINATION_COLUMNS.sortableColumns,
      allowedSearchFields: USER_PAGINATION_COLUMNS.searchableColumns,
      filterDto: UserFilterDto, // Use the filter DTO
    })
    query: PaginationQuery,
    @GetUser() currentUser: CurrentUserType,
  ) {
    const centerId = query.filter?.centerId as string;
    const targetCenterId = query.filter?.targetCenterId as string;
    const targetUserId = query.filter?.targetUserId as string;
    delete query.filter?.targetCenterId;
    delete query.filter?.targetUserId;

    const contextCenterId = currentUser.centerId;

    return this.userService.listUsers({
      query,
      userId: currentUser.id,
      targetUserId,
      centerId: centerId ?? contextCenterId,
      targetCenterId,
    });
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
  async getCurrentUserProfile(@GetUser() currentUser: CurrentUserType) {
    return this.userService.getCurrentUserProfile({
      userId: currentUser.id,
      centerId: currentUser.centerId,
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
  async getUserProfile(
    @Param('id') userId: string,
    @Query('centerId') centerId?: string,
    @GetUser() currentUser?: CurrentUserType,
  ) {
    return this.userService.getProfile({
      userId,
      centerId,
      currentUserId: currentUser?.id,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserRequestDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @Permissions(PERMISSIONS.USER.CREATE.action)
  async createUser(
    @Body() dto: CreateUserRequestDto,
    @GetUser() currentUser: CurrentUserType,
  ) {
    const user = await this.userService.createUser(dto);
    await this.userService.handleUserCenterAccess(user.id, dto, currentUser.id);
    return user;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateUserRequestDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.UPDATE.action)
  async updateUser(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRequestDto,
    @GetUser() currentUser: CurrentUserType,
  ) {
    return this.userService.updateUser(userId, dto, currentUser.id);
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
  ) {
    return this.userService.changePassword({ userId, dto });
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
    @GetUser() currentUser: CurrentUserType,
  ): Promise<ToggleUserStatusResponseDto> {
    await this.userService.activateUser(
      userId,
      { isActive: dto.isActive },
      currentUser.id,
    );
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
    @GetUser() currentUser: CurrentUserType,
  ): Promise<DeleteUserResponseDto> {
    await this.userService.deleteUser(userId, currentUser.id);
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
    @GetUser() currentUser: CurrentUserType,
  ): Promise<RestoreUserResponseDto> {
    await this.userService.restoreUser(userId, currentUser.id);
    return { message: 'User restored successfully' };
  }
}
