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
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { ActivateUserRequestDto } from '../dto/activate-user.dto';

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
    @Query('targetUserId') targetUserId?: string,
  ) {
    const centerId = query.filter?.centerId as string;
    return this.userService.listUsers({
      query,
      userId: currentUser.id,
      targetUserId,
      centerId,
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
    return this.userService.getCurrentUserProfile(
      currentUser.id,
      currentUser.centerId,
    );
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
    return this.userService.getProfile(userId, centerId, currentUser?.id);
  }

  @Get(':id/with-relations')
  @ApiOperation({
    summary: 'Get user by ID with all relations populated',
    description:
      'Get user with populated centers, center details, and roles inside centers for edit/preview',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User with relations retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.READ.action)
  async getUserByIdWithRelations(
    @Param('id') userId: string,
    @GetUser() currentUser?: CurrentUserType,
  ) {
    return this.userService.getUserByIdWithRelations(userId, currentUser?.id);
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
    return this.userService.createUser(dto, currentUser.id);
  }

  @Put(':id/profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.UPDATE.action)
  async updateProfile(
    @Param('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, dto);
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
    return this.userService.changePassword(userId, dto);
  }

  @Post(':id/activate')
  @Permissions(PERMISSIONS.USER.ACTIVATE.action)
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: ActivateUserRequestDto })
  @ApiResponse({
    status: 200,
    description: 'User activation status updated successfully',
  })
  async activateUser(
    @Param('id') userId: string,
    @Body() dto: ActivateUserRequestDto,
    @GetUser() currentUser: CurrentUserType,
  ) {
    // Convert the DTO to the expected format
    const activationData = {
      isActive: true, // Default to active
    };

    await this.userService.activateUser(userId, activationData, currentUser.id);
    return { id: userId, message: 'User activated successfully' };
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.USER.UPDATE.action)
  @ApiOperation({ summary: 'Toggle user active status' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleUserStatus(
    @Param('id') userId: string,
    @Body() body: { isActive: boolean },
    @GetUser() currentUser: CurrentUserType,
  ) {
    await this.userService.activateUser(
      userId,
      { isActive: body.isActive },
      currentUser.id,
    );
    return {
      id: userId,
      message: `User ${body.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: body.isActive,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.DELETE.action)
  async deleteUser(
    @Param('id') userId: string,
    @GetUser() currentUser: CurrentUserType,
  ) {
    await this.userService.deleteUser(userId, currentUser.id);
    return { message: 'User deleted successfully' };
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.RESTORE.action)
  async restoreUser(
    @Param('id') userId: string,
    @GetUser() currentUser: CurrentUserType,
  ) {
    await this.userService.restoreUser(userId, currentUser.id);
    return { message: 'User restored successfully' };
  }

  // ===== FINE-GRAINED ACCESS ENDPOINTS =====
  @Get(':id/centers')
  @ApiOperation({ summary: 'Get centers that a user is part of' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User centers retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.READ.action)
  async getUserCenters(
    @Param('id') userId: string,
    @GetUser() currentUser: CurrentUserType,
  ) {
    // First check if current user can access the target user
    await this.userService.getProfile(userId, undefined, currentUser.id);

    // Get user centers from access control service
    const userService = this.userService as any; // Access the accessControlService
    const centers =
      await userService.accessControlService.getUserCenters(userId);

    return {
      userId,
      centers: centers.map((center: any) => ({
        centerId: center.centerId,
        centerName: center.center?.name || 'Unknown Center',
        isActive: center.isActive,
        joinedAt: center.createdAt,
      })),
    };
  }

  @Get(':id/access')
  @ApiOperation({ summary: 'Get users that this user can access/manage' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User access list retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(PERMISSIONS.USER.READ.action)
  async getUserAccess(
    @Param('id') userId: string,
    @GetUser() currentUser: CurrentUserType,
  ) {
    // First check if current user can access the target user
    await this.userService.getProfile(userId, undefined, currentUser.id);

    // Get user access list from access control service
    const userService = this.userService as any; // Access the accessControlService
    const accessList =
      await userService.accessControlService.listUserAccesses(userId);

    return {
      userId,
      accessList: accessList.map((access: any) => ({
        targetUserId: access.targetUserId,
        grantedAt: access.createdAt,
        centerId: access.centerId,
      })),
    };
  }
}
