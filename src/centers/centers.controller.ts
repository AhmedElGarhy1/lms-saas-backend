import { Controller, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { Roles } from '../access-control/decorators/roles.decorator';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';

@Controller('centers')
@UseGuards(RolesGuard, PermissionsGuard)
@Roles('Admin', 'Manager')
@Permissions('center:manage')
export class CentersController {}
