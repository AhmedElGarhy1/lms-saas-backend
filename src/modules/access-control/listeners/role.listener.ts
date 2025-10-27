import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RolesService } from '../services/roles.service';
import {
  AssignRoleEvent,
  RevokeRoleEvent,
  RoleAssignedEvent,
  RoleRevokedEvent,
  AccessControlEvents,
} from '../events/access-control.events';
import {
  RoleCreatedEvent,
  RoleUpdatedEvent,
  RoleDeletedEvent,
  RoleEvents,
} from '../events/role.events';

@Injectable()
export class RoleListener {
  constructor(
    private readonly rolesService: RolesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(AccessControlEvents.ASSIGN_ROLE)
  async handleAssignRole(event: AssignRoleEvent) {
    const { userProfileId, roleId, centerId, actor } = event;

    // Call service to assign role
    await this.rolesService.assignRole(
      { userProfileId, roleId, centerId },
      actor,
    );

    // Emit result event for activity logging
    this.eventEmitter.emit(
      AccessControlEvents.ROLE_ASSIGNED,
      new RoleAssignedEvent(userProfileId, roleId, centerId, actor),
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

    // Emit result event for activity logging
    this.eventEmitter.emit(
      AccessControlEvents.ROLE_REVOKED,
      new RoleRevokedEvent(userProfileId, centerId, actor),
    );
  }

  @OnEvent(RoleEvents.CREATED)
  async handleRoleCreated(event: RoleCreatedEvent) {
    // Handle role creation if needed
    // This could emit events for activity logging or other side effects
  }

  @OnEvent(RoleEvents.UPDATED)
  async handleRoleUpdated(event: RoleUpdatedEvent) {
    // Handle role updates if needed
  }

  @OnEvent(RoleEvents.DELETED)
  async handleRoleDeleted(event: RoleDeletedEvent) {
    // Handle role deletion if needed
  }
}
