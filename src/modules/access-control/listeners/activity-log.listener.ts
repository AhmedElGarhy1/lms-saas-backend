import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '@/modules/centers/enums/center-activity-type.enum';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { RoleActivityType } from '../enums/role-activity-type.enum';
import {
  CenterAccessGrantedEvent,
  CenterAccessRevokedEvent,
  UserAccessGrantedEvent,
  UserAccessRevokedEvent,
  BranchAccessGrantedEvent,
  BranchAccessRevokedEvent,
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
export class ActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(AccessControlEvents.CENTER_ACCESS_GRANTED)
  async handleCenterAccessGranted(event: CenterAccessGrantedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_GRANTED,
      {
        userProfileId: event.userProfileId,
        centerId: event.centerId,
        accessType: 'CENTER',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.CENTER_ACCESS_REVOKED)
  async handleCenterAccessRevoked(event: CenterAccessRevokedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_REVOKED,
      {
        userProfileId: event.userProfileId,
        centerId: event.centerId,
        accessType: 'CENTER',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.USER_ACCESS_GRANTED)
  async handleUserAccessGranted(event: UserAccessGrantedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_ACCESS_GRANTED,
      {
        granterUserProfileId: event.granterUserProfileId,
        targetUserProfileId: event.targetUserProfileId,
        centerId: event.centerId,
        accessType: 'USER',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.USER_ACCESS_REVOKED)
  async handleUserAccessRevoked(event: UserAccessRevokedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_ACCESS_REVOKED,
      {
        granterUserProfileId: event.granterUserProfileId,
        targetUserProfileId: event.targetUserProfileId,
        centerId: event.centerId,
        accessType: 'USER',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.BRANCH_ACCESS_GRANTED)
  async handleBranchAccessGranted(event: BranchAccessGrantedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_GRANTED, // Using center access type for branch access
      {
        userProfileId: event.userProfileId,
        branchId: event.branchId,
        centerId: event.centerId,
        accessType: 'BRANCH',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.BRANCH_ACCESS_REVOKED)
  async handleBranchAccessRevoked(event: BranchAccessRevokedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_REVOKED, // Using center access type for branch access
      {
        userProfileId: event.userProfileId,
        branchId: event.branchId,
        centerId: event.centerId,
        accessType: 'BRANCH',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.ROLE_ASSIGNED)
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

  @OnEvent(AccessControlEvents.ROLE_REVOKED)
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
}
