import {
  Controller,
  Get,
  Put,
  Body,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import {
  CreateUserRequestSchema,
  CreateUserRequest,
  CreateUserRequestDto,
} from './dto/create-user.dto';
import {
  UpdateProfileRequestSchema,
  UpdateProfileRequest,
  UpdateProfileRequestDto,
} from './dto/update-profile.dto';
import {
  ChangePasswordRequestSchema,
  ChangePasswordRequest,
  ChangePasswordRequestDto,
} from './dto/change-password.dto';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiResponse({
    status: 200,
    description: 'Returns the current user profile.',
    schema: {
      example: {
        id: '1234567890abcdef12345678',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: '2023-10-27T10:00:00.000Z',
        updatedAt: '2023-10-27T10:00:00.000Z',
      },
    },
  })
  getProfile(@GetUser() user: CurrentUserType) {
    return this.usersService.getProfile(user.id);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('user:update')
  @Put('profile')
  @ApiBody({ type: UpdateProfileRequestDto })
  @ApiResponse({ status: 200, description: 'Updates user profile.' })
  updateProfile(
    @Body(new ZodValidationPipe(UpdateProfileRequestSchema))
    dto: UpdateProfileRequest,
    @GetUser() user: CurrentUserType,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @ApiBody({ type: ChangePasswordRequestDto })
  @ApiResponse({ status: 200, description: 'Changes user password.' })
  changePassword(
    @Body(new ZodValidationPipe(ChangePasswordRequestSchema))
    dto: ChangePasswordRequest,
    @GetUser() user: CurrentUserType,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post()
  @ApiBody({ type: CreateUserRequestDto })
  @ApiResponse({ status: 201, description: 'Creates a new user.' })
  createUser(
    @Body(new ZodValidationPipe(CreateUserRequestSchema))
    dto: CreateUserRequest,
  ) {
    return this.usersService.createUser(dto);
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all users.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1234567890abcdef12345678' },
          username: { type: 'string', example: 'testuser' },
          email: { type: 'string', example: 'test@example.com' },
          createdAt: { type: 'string', example: '2023-10-27T10:00:00.000Z' },
          updatedAt: { type: 'string', example: '2023-10-27T10:00:00.000Z' },
        },
      },
    },
  })
  listUsers(@Paginate() query: PaginateQuery) {
    return this.usersService.listUsers(query);
  }

  /**
   * Get users the current user has access to (any type)
   */
  @Get('accessible')
  @ApiResponse({
    status: 200,
    description: 'Users the current user can access.',
  })
  getAccessibleUsers(@GetUser() user: CurrentUserType) {
    return this.usersService.getAccessibleUsers(user.id);
  }

  /**
   * Get teachers the current user has access to
   */
  @Get('accessible/teachers')
  @ApiResponse({
    status: 200,
    description: 'Teachers the current user can access.',
  })
  getAccessibleTeachers(@GetUser() user: CurrentUserType) {
    return this.usersService.getAccessibleUsers(user.id, 'Teacher');
  }

  /**
   * Get students the current user has access to
   */
  @Get('accessible/students')
  @ApiResponse({
    status: 200,
    description: 'Students the current user can access.',
  })
  getAccessibleStudents(@GetUser() user: CurrentUserType) {
    return this.usersService.getAccessibleUsers(user.id, 'Student');
  }
}
