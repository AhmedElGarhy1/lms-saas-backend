import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '../enums/center-activity-type.enum';
import {
  CenterCreatedEvent,
  CenterUpdatedEvent,
  CenterDeletedEvent,
  CenterRestoredEvent,
  CenterOwnerAssignedEvent,
  CenterEvents,
} from '../events/center.events';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchEvents,
} from '../events/branch.events';

@Injectable()
export class ActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(event: CenterCreatedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_CREATED,
      {
        targetCenterId: event.center.id,
        name: event.center.name,
        createdBy: event.actor.id,
      },
      event.actor,
    );
  }

  @OnEvent(CenterEvents.OWNER_ASSIGNED)
  async handleCenterOwnerAssigned(event: CenterOwnerAssignedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_CREATED,
      {
        targetCenterId: event.center.id,
        ownerProfileId: event.userProfile.id,
        assignedBy: event.actor.id,
      },
      event.actor,
    );
  }

  @OnEvent(CenterEvents.UPDATED)
  async handleCenterUpdated(event: CenterUpdatedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_UPDATED,
      {
        centerId: event.centerId,
        updates: event.updates,
      },
      event.actor,
    );
  }

  @OnEvent(CenterEvents.DELETED)
  async handleCenterDeleted(event: CenterDeletedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_DELETED,
      {
        centerId: event.centerId,
      },
      event.actor,
    );
  }

  @OnEvent(CenterEvents.RESTORED)
  async handleCenterRestored(event: CenterRestoredEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_RESTORED,
      {
        centerId: event.centerId,
      },
      event.actor,
    );
  }

  @OnEvent(BranchEvents.CREATED)
  async handleBranchCreated(event: BranchCreatedEvent) {
    await this.activityLogService.log(
      CenterActivityType.BRANCH_CREATED,
      {
        branchId: event.branch.id,
        branchLocation: event.branch.location,
        centerId: event.branch.centerId,
      },
      event.actor,
    );
  }

  @OnEvent(BranchEvents.UPDATED)
  async handleBranchUpdated(event: BranchUpdatedEvent) {
    await this.activityLogService.log(
      CenterActivityType.BRANCH_UPDATED,
      {
        branchId: event.branchId,
        updatedFields: Object.keys(event.updates),
      },
      event.actor,
    );
  }

  @OnEvent(BranchEvents.DELETED)
  async handleBranchDeleted(event: BranchDeletedEvent) {
    await this.activityLogService.log(
      CenterActivityType.BRANCH_DELETED,
      {
        branchId: event.branchId,
      },
      event.actor,
    );
  }
}
