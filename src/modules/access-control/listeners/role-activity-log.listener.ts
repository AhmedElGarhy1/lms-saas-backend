import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { RoleActivityType } from '../enums/role-activity-type.enum';
import {
  RoleCreatedEvent,
  RoleUpdatedEvent,
  RoleDeletedEvent,
  RoleAssignedEvent,
  RoleRevokedEvent,
  RoleEvents,
} from '../events/role.events';

@Injectable()
export class RoleActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(RoleEvents.CREATED)
  async handleRoleCreated(event: RoleCreatedEvent) {
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

  @OnEvent(RoleEvents.UPDATED)
  async handleRoleUpdated(event: RoleUpdatedEvent) {
    await this.activityLogService.log(
      RoleActivityType.ROLE_UPDATED,
      {
        roleId: event.roleId,
        updatedFields: Object.keys(event.updates),
      },
      event.actor,
    );
  }

  @OnEvent(RoleEvents.DELETED)
  async handleRoleDeleted(event: RoleDeletedEvent) {
    await this.activityLogService.log(
      RoleActivityType.ROLE_DELETED,
      {
        roleId: event.roleId,
      },
      event.actor,
    );
  }

  @OnEvent(RoleEvents.ASSIGNED)
  async handleRoleAssigned(event: RoleAssignedEvent) {
    await this.activityLogService.log(
      RoleActivityType.ROLE_ASSIGNED,
      {
        userProfileId: event.userProfileId,
        roleId: event.roleId,
        centerId: event.centerId,
      },
      event.actor,
    );
  }

  @OnEvent(RoleEvents.REVOKED)
  async handleRoleRevoked(event: RoleRevokedEvent) {
    await this.activityLogService.log(
      RoleActivityType.ROLE_REMOVED,
      {
        userProfileId: event.userProfileId,
        centerId: event.centerId,
      },
      event.actor,
    );
  }
}
