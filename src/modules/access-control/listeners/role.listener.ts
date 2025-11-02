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
import {
  AssignCenterOwnerEvent,
  CenterEvents,
} from '@/modules/centers/events/center.events';
import { createOwnerRoleData, DefaultRoles } from '../constants/roles';
import { ProfileRoleRepository } from '../repositories/profile-role.repository';
import { RolesRepository } from '../repositories/roles.repository';

@Injectable()
export class RoleListener {
  constructor(
    private readonly rolesService: RolesService,
    private readonly activityLogService: ActivityLogService,
    private readonly profileRoleRepository: ProfileRoleRepository,
    private readonly rolesRepository: RolesRepository,
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

  @OnEvent(CenterEvents.ASSIGN_OWNER)
  async handleAssignOwner(event: AssignCenterOwnerEvent) {
    const { center, userProfile, actor } = event;

    if (!actor) {
      return;
    }

    const role = await this.rolesService.createRole(
      createOwnerRoleData(center.id),
      actor,
    );

    // Only assign role to userProfile if userProfile is provided
    if (userProfile) {
      await this.handleAssignRole(
        new AssignRoleEvent(userProfile.id, role.id, actor, center.id),
      );
    }
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
    const { roleId, actor } = event;
    // remove profiles assigned to this role
    const profileRoles =
      await this.profileRoleRepository.findProfileRolesByRoleId(roleId);
    // can done on background job
    await Promise.all(
      profileRoles.map((pr) =>
        this.rolesService.removeUserRole(
          {
            userProfileId: pr.userProfileId,
            roleId: pr.roleId,
            centerId: pr.centerId,
          },
          actor,
        ),
      ),
    );

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
