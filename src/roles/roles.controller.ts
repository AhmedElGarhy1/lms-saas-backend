import { Controller, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { Roles } from '../access-control/decorators/roles.decorator';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';

@Controller('roles')
@UseGuards(RolesGuard, PermissionsGuard)
@Roles('Admin')
@Permissions('role:manage')
export class RolesController {}
