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
import { Public } from '../shared/decorators/public.decorator';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { Roles } from '../access-control/decorators/roles.decorator';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

class UpdateProfileExample {
  @ApiProperty({
    description: 'The new username for the user.',
    example: 'newusername',
  })
  username: string;

  @ApiProperty({
    description: 'The new email for the user.',
    example: 'newemail@example.com',
  })
  email: string;
}

class ChangePasswordExample {
  @ApiProperty({
    description: 'The current password of the user.',
    example: 'oldpassword',
  })
  currentPassword: string;

  @ApiProperty({
    description: 'The new password for the user.',
    example: 'newpassword',
  })
  newPassword: string;
}

class CreateUserExample {
  @ApiProperty({
    description: 'The username for the new user.',
    example: 'newadmin',
  })
  username: string;

  @ApiProperty({
    description: 'The email for the new user.',
    example: 'admin@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The password for the new user.',
    example: 'adminpassword',
  })
  password: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles('User')
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
  listUsers() {
    return this.usersService.listUsers();
  }
}
