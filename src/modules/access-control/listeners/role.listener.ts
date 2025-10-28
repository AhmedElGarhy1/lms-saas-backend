import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RolesService } from '../services/roles.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { RoleActivityType } from '../enums/role-activity-type.enum';
import {
  AssignRoleEvent,
  RevokeRoleEvent,
  AccessControlEvents,
} from '../events/access-control.events';
import {
  CreateRoleEvent,
  UpdateRoleEvent,
  DeleteRoleEvent,
  RoleEvents,
} from '../events/role.events';

@Injectable()
export class RoleListener {
  constructor(
    private readonly rolesService: RolesService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(AccessControlEvents.ASSIGN_ROLE)
  async handleAssignRole(event: AssignRoleEvent) {
    const { userProfileId, roleId, centerId, actor } = event;

    // Call service to assign role
    await this.rolesService.assignRole(
      { userProfileId, roleId, centerId },
      actor,
    );

    // Log activity
    await this.activityLogService.log(
      RoleActivityType.ROLE_ASSIGNED,
      {
        userProfileId,
        roleId,
        centerId,
      },
      actor,
    );
  }

  @OnEvent(AccessControlEvents.REVOKE_ROLE)
  async handleRevokeRole(event: RevokeRoleEvent) {
    const { userProfileId, roleId, centerId, actor } = event;

    // Call service to revoke role
    await this.rolesService.removeUserRole(
      { userProfileId, roleId, centerId },
      actor,
    );

    // Log activity
    await this.activityLogService.log(
      RoleActivityType.ROLE_REMOVED,
      {
        userProfileId,
        centerId,
      },
      actor,
    );
  }

  @OnEvent(RoleEvents.CREATE)
  async handleRoleCreated(event: CreateRoleEvent) {
    // Log activity
    await this.activityLogService.log(
      RoleActivityType.ROLE_CREATED,
      {
        roleId: event.role.id,
        roleName: event.role.name,
        centerId: event.role.centerId,
      },
      event.actor,
    );
  }

  @OnEvent(RoleEvents.UPDATE)
  async handleRoleUpdated(event: UpdateRoleEvent) {
    // Log activity
    await this.activityLogService.log(
      RoleActivityType.ROLE_UPDATED,
      {
        roleId: event.roleId,
        updatedFields: Object.keys(event.updates),
      },
      event.actor,
    );
  }

  @OnEvent(RoleEvents.DELETE)
  async handleRoleDeleted(event: DeleteRoleEvent) {
    // Log activity
    await this.activityLogService.log(
      RoleActivityType.ROLE_DELETED,
      {
        roleId: event.roleId,
      },
      event.actor,
    );
  }
}
