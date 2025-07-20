import {
  Controller,
  Get,
  Put,
  Body,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { Roles } from '../access-control/decorators/roles.decorator';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

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

  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('User')
  @Permissions('user:update')
  @Put('me')
  @ApiBody({
    type: UpdateProfileDto,
    examples: {
      user: {
        value: {
          username: 'newusername',
          email: 'newemail@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Updates the current user profile.',
    schema: {
      example: {
        id: '1234567890abcdef12345678',
        username: 'newusername',
        email: 'newemail@example.com',
        createdAt: '2023-10-27T10:00:00.000Z',
        updatedAt: '2023-10-27T10:00:00.000Z',
      },
    },
  })
  updateProfile(
    @GetUser() user: CurrentUserType,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('User')
  @Patch('me/password')
  @ApiBody({
    type: ChangePasswordDto,
    examples: {
      user: {
        value: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Changes the current user password.',
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
  changePassword(
    @GetUser() user: CurrentUserType,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('Admin')
  @Post()
  @ApiBody({
    type: CreateUserDto,
    examples: {
      user: {
        value: {
          username: 'newadmin',
          email: 'admin@example.com',
          password: 'adminpassword',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Creates a new user.',
    schema: {
      example: {
        id: '1234567890abcdef12345679',
        username: 'newadmin',
        email: 'admin@example.com',
        createdAt: '2023-10-27T10:00:00.000Z',
        updatedAt: '2023-10-27T10:00:00.000Z',
      },
    },
  })
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('Admin')
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
