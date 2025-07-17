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
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { Public } from '../shared/decorators/public.decorator';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { Roles } from '../access-control/decorators/roles.decorator';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles('User')
  @Get('me')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.getProfile(user.id);
  }

  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('User')
  @Permissions('user:update')
  @Put('me')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('User')
  @Patch('me/password')
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('Admin')
  @Permissions('user:invite')
  @Post('invite')
  inviteUser(@Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(dto);
  }

  @Public()
  @Post('accept-invite')
  async acceptInvite(
    @Body() body: { token: string; password: string; fullName?: string },
  ) {
    return this.usersService.acceptInvite(
      body.token,
      body.password,
      body.fullName,
    );
  }
}
