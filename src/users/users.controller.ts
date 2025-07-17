import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Patch,
  Post,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
// import { PermissionsGuard } from '../shared/guards/permissions.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AssignCenterDto } from './dto/assign-center.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.getProfile(user.id);
  }

  @Put('me')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post(':id/assign-center')
  assignToCenter(@Param('id') userId: string, @Body() dto: AssignCenterDto) {
    return this.usersService.assignToCenter(userId, dto);
  }

  @Post('invite')
  inviteUser(@Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(dto);
  }
}
