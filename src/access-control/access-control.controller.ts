import { Controller, Post, Body, Delete, HttpCode } from '@nestjs/common';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { AccessControlService } from './access-control.service';

@Controller('access-control')
export class AccessControlController {
  constructor(private readonly acService: AccessControlService) {}

  @Post('assign-role')
  assignRole(@Body() dto: AssignRoleDto) {
    return this.acService.assignRole(dto);
  }

  @Delete('remove-role')
  @HttpCode(204)
  async removeRole(@Body() dto: AssignRoleDto) {
    await this.acService.removeRole(dto);
  }

  @Post('assign-permission')
  assignPermission(@Body() dto: AssignPermissionDto) {
    return this.acService.assignPermission(dto);
  }

  @Delete('remove-permission')
  @HttpCode(204)
  async removePermission(@Body() dto: AssignPermissionDto) {
    await this.acService.removePermission(dto);
  }
}
