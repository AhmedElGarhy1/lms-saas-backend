import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '../enums/center-activity-type.enum';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchEvents,
} from '../events/branch.events';

@Injectable()
export class BranchActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

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
