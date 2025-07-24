import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { CreateUserRequestDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ChangePasswordRequestDto } from './dto/change-password.dto';
import { ActivateUserRequestDto } from './dto/activate-user.dto';
import { ActivateUserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listUsers(
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    // Parse filter parameters manually from the request query
    const rawQuery = req.query;
    const parsedQuery = {
      ...query,
      filter: {
        ...query.filter,
        // Parse filter parameters manually and ensure they are strings
        ...(rawQuery['filter[name]'] && {
          name: Array.isArray(rawQuery['filter[name]'])
            ? rawQuery['filter[name]'][0]
            : (rawQuery['filter[name]'] as string),
        }),
        ...(rawQuery['filter[email]'] && {
          email: Array.isArray(rawQuery['filter[email]'])
            ? rawQuery['filter[email]'][0]
            : (rawQuery['filter[email]'] as string),
        }),
      },
    } as PaginateQuery;

    return this.usersService.listUsers(
      parsedQuery,
      user.id,
      user.scope,
      user.centerId,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@GetUser() user: CurrentUserType) {
    return this.usersService.getProfile(user.id, user.scope, user.centerId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfile(
    @GetUser() user: CurrentUserType,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('profile')
  @ApiOperation({ summary: 'Create a new profile for current user' })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Profile already exists' })
  createProfile(
    @GetUser() user: CurrentUserType,
    @Body() dto: CreateProfileDto,
  ) {
    return this.usersService.createProfile(user.id, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Invalid old password' })
  changePassword(
    @GetUser() user: CurrentUserType,
    @Body() dto: ChangePasswordRequestDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createUser(
    @Body() dto: CreateUserRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.usersService.createUser(dto, user.id);
  }

  @Get('accessible')
  @ApiOperation({ summary: 'Get users accessible to current user' })
  @ApiResponse({
    status: 200,
    description: 'Accessible users retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAccessibleUsers(
    @GetUser() user: CurrentUserType,
    @Query('type') type?: 'Teacher' | 'Student' | 'Guardian',
  ) {
    return this.usersService.getAccessibleUsers(user.id, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Param('id') id: string, @GetUser() user: CurrentUserType) {
    return this.usersService.getProfile(id, user.scope, user.centerId);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserPermissions(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ) {
    return this.usersService.getUserPermissions(id, user.scope, user.centerId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  @ApiResponse({
    status: 200,
    description: 'User activation status updated successfully',
    type: ActivateUserResponseDto,
  })
  @ApiBody({ type: ActivateUserRequestDto })
  async activateUser(
    @Param('id') id: string,
    @Body() dto: ActivateUserRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.usersService.activateUser(
      id,
      {
        isActive: dto.isActive,
        scopeType: dto.scopeType,
        centerId: dto.centerId,
      },
      user.id,
    );
  }

  @Get(':id/activation-status')
  @ApiOperation({ summary: 'Get user activation status' })
  @ApiResponse({
    status: 200,
    description: 'Activation status retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserActivationStatus(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ) {
    return this.usersService.getUserActivationStatus(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteUser(@Param('id') id: string, @GetUser() user: CurrentUserType) {
    return this.usersService.deleteUser(id, user.id);
  }
}
