import { Controller, Post, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { RolesService } from '../services/roles.service';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@ApiTags('Roles')
@Controller('roles/assign')
@ApiBearerAuth()
export class RoleAssignController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly activityLogService: ActivityLogService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Post()
  @CreateApiResponses('Assign a role to a user')
  @ApiBody({ type: AssignRoleDto })
  @Permissions(PERMISSIONS.ROLES.ASSIGN)
  async assignRole(@Body() dto: AssignRoleDto, @GetUser() user: ActorUser) {
    const result = await this.rolesService.assignRoleValidate(dto, user);
    await this.activityLogService.log(ActivityType.ROLE_ASSIGNED, {
      userProfileId: user.userProfileId,
      roleId: dto.roleId,
      assignedBy: user.userProfileId,
    });
    return ControllerResponse.success(
      result,
      this.i18n.translate('success.roleAssigned'),
    );
  }

  @Delete()
  @DeleteApiResponses('Remove a role from a user')
  @ApiBody({ type: AssignRoleDto })
  @Permissions(PERMISSIONS.ROLES.ASSIGN)
  async removeRole(@Body() dto: AssignRoleDto, @GetUser() user: ActorUser) {
    const result = await this.rolesService.removeUserRoleValidate(dto, user);
    await this.activityLogService.log(ActivityType.ROLE_REMOVED, {
      userProfileId: user.userProfileId,
      roleId: dto.roleId,
      removedBy: user.userProfileId,
    });
    return ControllerResponse.success(
      result,
      this.i18n.translate('success.roleRemoved'),
    );
  }
}
