import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { RolesService } from '../services/roles.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { RoleActivityType } from '../enums/role-activity-type.enum';
import {
  AssignRoleEvent,
  RevokeRoleEvent,
} from '../events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import {
  CreateRoleEvent,
  UpdateRoleEvent,
  DeleteRoleEvent,
  RestoreRoleEvent,
} from '../events/role.events';
import { RoleEvents } from '@/shared/events/role.events.enum';
import { AssignCenterOwnerEvent } from '@/modules/centers/events/center.events';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { createOwnerRoleData } from '../constants/roles';
import { ProfileRoleRepository } from '../repositories/profile-role.repository';
import { RolesRepository } from '../repositories/roles.repository';

@Injectable()
export class RoleListener {
  private readonly logger: Logger = new Logger(RoleListener.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly rolesService: RolesService,
    private readonly activityLogService: ActivityLogService,
    private readonly profileRoleRepository: ProfileRoleRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  @OnEvent(AccessControlEvents.ASSIGN_ROLE)
  async handleAssignRole(event: AssignRoleEvent) {
    const { userProfileId, roleId, centerId, actor } = event;

    try {
      // Call service to assign role
      await this.rolesService.assignRole(
        { userProfileId, roleId, centerId },
        actor,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle ${AccessControlEvents.ASSIGN_ROLE} event - userProfileId: ${userProfileId}, roleId: ${roleId}, centerId: ${centerId}, actorId: ${actor?.userProfileId || 'unknown'}`,
        error instanceof Error ? error.stack : String(error),
        {
          eventType: AccessControlEvents.ASSIGN_ROLE,
          userProfileId,
          roleId,
          centerId,
          actorId: actor?.userProfileId,
        },
      );
      return;
    }

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      RoleActivityType.ROLE_ASSIGNED,
      {
        userProfileId,
        roleId,
        centerId,
      },
      event.targetUserId ?? null,
    );
  }

  @OnEvent(AccessControlEvents.REVOKE_ROLE)
  async handleRevokeRole(event: RevokeRoleEvent) {
    const { userProfileId, roleId, centerId, actor } = event;

    try {
      // Call service to revoke role
      await this.rolesService.removeUserRole(
        { userProfileId, roleId, centerId },
        actor,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle ${AccessControlEvents.REVOKE_ROLE} event - userProfileId: ${userProfileId}, roleId: ${roleId}, centerId: ${centerId}, actorId: ${actor?.userProfileId || 'unknown'}`,
        error instanceof Error ? error.stack : String(error),
        {
          eventType: AccessControlEvents.REVOKE_ROLE,
          userProfileId,
          roleId,
          centerId,
          actorId: actor?.userProfileId,
        },
      );
      return;
    }

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      RoleActivityType.ROLE_REMOVED,
      {
        userProfileId,
        centerId,
      },
      event.targetUserId ?? null,
    );
  }

  @OnEvent(RoleEvents.CREATED)
  async handleRoleCreated(event: CreateRoleEvent) {
    // Role creation doesn't have a specific target user, pass null
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      RoleActivityType.ROLE_CREATED,
      {
        roleId: event.role.id,
        roleName: event.role.name,
        centerId: event.role.centerId,
      },
      null,
    );
  }

  @OnEvent(CenterEvents.ASSIGN_OWNER)
  async handleAssignOwner(event: AssignCenterOwnerEvent) {
    const { center, userProfile, actor } = event;

    if (!actor) {
      this.logger.warn(
        `Assign owner event missing actor - centerId: ${center.id}, userProfileId: ${userProfile?.id}`,
      );
      return;
    }

    try {
      const role = await this.rolesService.createRole(
        createOwnerRoleData(center.id),
        actor,
      );

      // Only assign role to userProfile if userProfile is provided
      if (userProfile) {
        await this.handleAssignRole(
          new AssignRoleEvent(
            userProfile.id,
            role.id,
            actor,
            center.id,
            userProfile.userId,
          ),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle ${CenterEvents.ASSIGN_OWNER} event - centerId: ${center.id}, userProfileId: ${userProfile?.id}, actorId: ${actor?.userProfileId || 'unknown'}`,
        error instanceof Error ? error.stack : String(error),
        {
          eventType: CenterEvents.ASSIGN_OWNER,
          centerId: center.id,
          userProfileId: userProfile?.id,
          actorId: actor?.userProfileId,
        },
      );
    }
  }

  @OnEvent(RoleEvents.UPDATED)
  async handleRoleUpdated(event: UpdateRoleEvent) {
    // Role update doesn't have a specific target user, pass null
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      RoleActivityType.ROLE_UPDATED,
      {
        roleId: event.roleId,
        updatedFields: Object.keys(event.updates),
      },
      null,
    );
  }

  @OnEvent(RoleEvents.DELETED)
  async handleRoleDeleted(event: DeleteRoleEvent) {
    const { roleId, actor } = event;
    try {
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
    } catch (error) {
      this.logger.error(
        `Failed to handle ${RoleEvents.DELETED} event - roleId: ${roleId}, actorId: ${actor?.userProfileId || 'unknown'}`,
        error instanceof Error ? error.stack : String(error),
        {
          eventType: RoleEvents.DELETED,
          roleId,
          actorId: actor?.userProfileId,
        },
      );
      return;
    }

    // Role deletion doesn't have a specific target user, pass null
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      RoleActivityType.ROLE_DELETED,
      {
        roleId: event.roleId,
      },
      null,
    );
  }

  @OnEvent(RoleEvents.RESTORED)
  async handleRoleRestored(event: RestoreRoleEvent) {
    // Role restore doesn't have a specific target user, pass null
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      RoleActivityType.ROLE_RESTORED,
      {
        roleId: event.roleId,
      },
      null,
    );
  }
}
